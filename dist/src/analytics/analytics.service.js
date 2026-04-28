"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../ai/ai.service");
const mappers_1 = require("../common/mappers");
const metrics_service_1 = require("../metrics/metrics.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    ai;
    metricsService;
    constructor(prisma, ai, metricsService) {
        this.prisma = prisma;
        this.ai = ai;
        this.metricsService = metricsService;
    }
    async getPostCommentsAnalysis(postId) {
        const comments = await this.getCommentsWithAnalysis(postId);
        const summary = this.buildSummary(postId, comments);
        return {
            summary,
            comments: comments.map((row) => (0, mappers_1.mapAnalysis)(row, row.analysis)),
        };
    }
    async getCommentsWorkbenchV2(postId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException(`Post '${postId}' not found`);
        }
        const comments = await this.getCommentsWithAnalysis(postId);
        const summary = this.buildSummary(postId, comments);
        const items = comments.map((row) => {
            const mapped = (0, mappers_1.mapAnalysis)(row, row.analysis);
            return {
                commentId: row.id,
                username: row.username,
                text: row.text,
                likes: row.likes,
                createdAt: mapped.createdAt,
                sentiment: mapped.sentiment,
                emotion: mapped.emotion,
                confidence: mapped.confidence,
                analysisStatus: mapped.status,
                retryCount: row.analysis?.retryCount ?? 0,
                lastAttemptAt: row.analysis?.lastAttemptAt?.toISOString() ?? null,
                error: row.analysis?.error ?? null,
            };
        });
        const emotions = Array.from(new Set(items
            .map((item) => item.emotion)
            .filter((emotion) => emotion && emotion !== '-')));
        const sentiments = Array.from(new Set(items
            .filter((item) => item.analysisStatus === 'analyzed')
            .map((item) => item.sentiment)));
        return {
            header: {
                postId,
                clientId: post.client.id,
                clientName: post.client.name,
                postCaption: post.caption,
                publishedAt: (0, mappers_1.formatPostDate)(post.publishedAt),
                totalComments: post.commentsCount,
            },
            summary: {
                total: summary.total,
                pending: items.filter((item) => item.analysisStatus === 'pending').length,
                analyzed: summary.analyzed,
                failed: items.filter((item) => item.analysisStatus === 'failed').length,
                positive: summary.positive,
                negative: summary.negative,
                neutral: summary.neutral,
            },
            filtersMeta: {
                emotions,
                sentiments,
                statuses: ['pending', 'analyzed', 'failed'],
            },
            items,
            actions: {
                canAnalyzePending: items.some((item) => item.analysisStatus === 'pending'),
                canRefresh: true,
                canReanalyzeRow: true,
            },
        };
    }
    async analyzePostComments(postId) {
        const comments = await this.getCommentsWithAnalysis(postId);
        const pending = comments.filter((row) => row.analysis?.status !== client_1.AnalysisStatus.analyzed);
        if (pending.length === 0) {
            return this.getPostCommentsAnalysis(postId);
        }
        await this.analyzeRows(postId, pending);
        await this.metricsService.recomputePostMetric(postId);
        return this.getPostCommentsAnalysis(postId);
    }
    async reanalyzeComment(postId, commentId) {
        const target = await this.prisma.comment.findFirst({
            where: { id: commentId, postId },
            include: { analysis: true },
        });
        if (!target) {
            throw new common_1.NotFoundException(`Comment '${commentId}' not found for post '${postId}'`);
        }
        await this.analyzeRows(postId, [target]);
        await this.metricsService.recomputePostMetric(postId);
        return this.getCommentsWorkbenchV2(postId);
    }
    async analyzeRows(postId, rows) {
        try {
            const results = await this.ai.analyzeBatch(rows.map((item) => item.text));
            await this.prisma.$transaction(async (tx) => {
                for (let index = 0; index < rows.length; index += 1) {
                    const source = rows[index];
                    const result = results[index];
                    const attemptAt = new Date();
                    if (!source) {
                        continue;
                    }
                    const analysisError = this.resolveAnalysisError(result);
                    if (analysisError) {
                        await tx.commentAnalysis.upsert({
                            where: { commentId: source.id },
                            create: {
                                commentId: source.id,
                                postId,
                                status: client_1.AnalysisStatus.failed,
                                retryCount: 1,
                                lastAttemptAt: attemptAt,
                                error: analysisError,
                            },
                            update: {
                                sentiment: null,
                                emotion: null,
                                confidence: null,
                                status: client_1.AnalysisStatus.failed,
                                analyzedAt: null,
                                retryCount: {
                                    increment: 1,
                                },
                                lastAttemptAt: attemptAt,
                                error: analysisError,
                            },
                        });
                        continue;
                    }
                    await tx.commentAnalysis.upsert({
                        where: { commentId: source.id },
                        create: {
                            commentId: source.id,
                            postId,
                            sentiment: (0, mappers_1.sentimentFromEmotion)(result.predictedEmotion),
                            emotion: result.predictedEmotion,
                            confidence: result.confidence,
                            status: client_1.AnalysisStatus.analyzed,
                            analyzedAt: attemptAt,
                            retryCount: 1,
                            lastAttemptAt: attemptAt,
                        },
                        update: {
                            sentiment: (0, mappers_1.sentimentFromEmotion)(result.predictedEmotion),
                            emotion: result.predictedEmotion,
                            confidence: result.confidence,
                            status: client_1.AnalysisStatus.analyzed,
                            analyzedAt: attemptAt,
                            retryCount: {
                                increment: 1,
                            },
                            lastAttemptAt: attemptAt,
                            error: null,
                        },
                    });
                }
                const analyzedCount = await tx.commentAnalysis.count({
                    where: { postId, status: client_1.AnalysisStatus.analyzed },
                });
                await tx.post.update({
                    where: { id: postId },
                    data: { analyzedComments: analyzedCount },
                });
            });
        }
        catch (error) {
            this.ai.logFailure(error);
            await this.prisma.$transaction(async (tx) => {
                for (const source of rows) {
                    const attemptAt = new Date();
                    await tx.commentAnalysis.upsert({
                        where: { commentId: source.id },
                        create: {
                            commentId: source.id,
                            postId,
                            status: client_1.AnalysisStatus.failed,
                            retryCount: 1,
                            lastAttemptAt: attemptAt,
                            error: error instanceof Error ? error.message : 'AI request failed',
                        },
                        update: {
                            status: client_1.AnalysisStatus.failed,
                            retryCount: {
                                increment: 1,
                            },
                            lastAttemptAt: attemptAt,
                            error: error instanceof Error ? error.message : 'AI request failed',
                        },
                    });
                }
            });
        }
    }
    async getCommentsWithAnalysis(postId) {
        return this.prisma.comment.findMany({
            where: { postId },
            include: { analysis: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    resolveAnalysisError(result) {
        if (!result) {
            return 'Missing IA result for comment';
        }
        if (!result.predictedEmotion) {
            return result.error ?? 'Emotion not classifiable';
        }
        return null;
    }
    buildSummary(postId, comments) {
        const valid = comments
            .map((row) => row.analysis)
            .filter(Boolean);
        const analyzed = valid.filter((item) => item.status === client_1.AnalysisStatus.analyzed);
        const emotionCount = new Map();
        analyzed.forEach((item) => {
            if (!item.emotion)
                return;
            emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
        });
        const topEmotion = [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        return {
            postId,
            total: comments.length,
            analyzed: analyzed.length,
            positive: analyzed.filter((item) => item.sentiment === 'POSITIVO').length,
            negative: analyzed.filter((item) => item.sentiment === 'NEGATIVO').length,
            neutral: analyzed.filter((item) => item.sentiment === 'NEUTRAL').length,
            ...(topEmotion ? { topEmotion } : {}),
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        metrics_service_1.MetricsService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map