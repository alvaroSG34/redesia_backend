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
var InstagramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const rxjs_1 = require("rxjs");
const ai_service_1 = require("../ai/ai.service");
const mappers_1 = require("../common/mappers");
const metrics_service_1 = require("../metrics/metrics.service");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_service_1 = require("../security/crypto.service");
let InstagramService = InstagramService_1 = class InstagramService {
    prisma;
    http;
    crypto;
    metrics;
    ai;
    logger = new common_1.Logger(InstagramService_1.name);
    graphBase = 'https://graph.facebook.com/v22.0';
    constructor(prisma, http, crypto, metrics, ai) {
        this.prisma = prisma;
        this.http = http;
        this.crypto = crypto;
        this.metrics = metrics;
        this.ai = ai;
    }
    async syncAccount(clientId, accountId, trigger = client_1.SyncTrigger.manual) {
        const account = await this.prisma.socialAccount.findFirst({
            where: { id: accountId, clientId },
            include: { token: true },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Account '${accountId}' not found for client '${clientId}'`);
        }
        const syncRun = await this.prisma.syncRun.create({
            data: {
                trigger,
                status: client_1.SyncRunStatus.running,
                clientId,
                accountId,
            },
        });
        try {
            if (!account.token?.encryptedLongLivedToken &&
                !account.token?.encryptedAccessToken) {
                throw new Error('No OAuth token found for account');
            }
            if (account.token.expiresAt && account.token.expiresAt <= new Date()) {
                throw new Error('OAuth token expired for account');
            }
            const token = account.token.encryptedLongLivedToken
                ? this.crypto.decrypt(account.token.encryptedLongLivedToken)
                : this.crypto.decrypt(account.token.encryptedAccessToken);
            const existingPostsCount = await this.prisma.post.count({
                where: { clientId, accountId },
            });
            const lastSyncAt = existingPostsCount === 0 ? null : account.lastSyncAt;
            const igBusinessId = account.igBusinessId;
            if (!igBusinessId) {
                throw new Error('igBusinessId is missing in social account');
            }
            const mediaResponse = await this.retryRequest(async () => {
                return this.graphGet(`/${igBusinessId}/media`, {
                    fields: 'id,caption,timestamp,like_count,comments_count,media_type,media_url',
                    access_token: token,
                });
            });
            const media = mediaResponse.data ?? [];
            let postsSynced = 0;
            let commentsSynced = 0;
            const syncedPostIds = new Set();
            for (const item of media) {
                if (!item.id)
                    continue;
                syncedPostIds.add(item.id);
                const publishedAt = this.parseGraphDate(item.timestamp);
                const isRecentPost = this.isRecentItem(publishedAt, lastSyncAt);
                await this.prisma.post.upsert({
                    where: { id: item.id },
                    create: {
                        id: item.id,
                        clientId,
                        accountId,
                        caption: item.caption ?? '',
                        publishedAt,
                        imageUrl: item.media_url,
                        imageHint: item.media_type,
                        likes: item.like_count ?? 0,
                        commentsCount: item.comments_count ?? 0,
                        analyzedComments: 0,
                    },
                    update: {
                        caption: item.caption ?? '',
                        publishedAt,
                        imageUrl: item.media_url,
                        imageHint: item.media_type,
                        likes: item.like_count ?? 0,
                        commentsCount: item.comments_count ?? 0,
                    },
                });
                if (isRecentPost) {
                    postsSynced += 1;
                }
                const commentResponse = await this.retryRequest(async () => {
                    return this.graphGet(`/${item.id}/comments`, {
                        fields: 'id,text,username,timestamp,like_count',
                        order: 'reverse_chronological',
                        limit: '100',
                        access_token: token,
                    });
                });
                const comments = commentResponse.data ?? [];
                for (const comment of comments) {
                    if (!comment.id)
                        continue;
                    const createdAt = this.parseGraphDate(comment.timestamp);
                    commentsSynced += 1;
                    await this.prisma.comment.upsert({
                        where: { id: comment.id },
                        create: {
                            id: comment.id,
                            postId: item.id,
                            username: comment.username ?? '@unknown',
                            text: comment.text ?? '',
                            likes: comment.like_count ?? 0,
                            createdAt,
                        },
                        update: {
                            text: comment.text ?? '',
                            likes: comment.like_count ?? 0,
                            username: comment.username ?? '@unknown',
                            createdAt,
                        },
                    });
                    await this.prisma.commentAnalysis.upsert({
                        where: { commentId: comment.id },
                        create: {
                            commentId: comment.id,
                            postId: item.id,
                            status: client_1.AnalysisStatus.pending,
                        },
                        update: {
                            status: client_1.AnalysisStatus.pending,
                            sentiment: null,
                            emotion: null,
                            confidence: null,
                            analyzedAt: null,
                            error: null,
                        },
                    });
                }
            }
            const analysisResult = await this.analyzePendingCommentsForPosts([
                ...syncedPostIds,
            ]);
            for (const postId of syncedPostIds) {
                await this.metrics.recomputePostMetric(postId);
            }
            await this.prisma.$transaction([
                this.prisma.socialAccount.update({
                    where: { id: accountId },
                    data: {
                        status: client_1.AccountStatus.CONECTADO,
                        lastSyncAt: new Date(),
                    },
                }),
                this.prisma.client.update({
                    where: { id: clientId },
                    data: { connected: true, status: client_1.ClientStatus.ACTIVO },
                }),
                this.prisma.syncRun.update({
                    where: { id: syncRun.id },
                    data: {
                        status: client_1.SyncRunStatus.success,
                        finishedAt: new Date(),
                        postsSynced,
                        commentsSynced,
                        analyzedCount: analysisResult.analyzedCount,
                        error: analysisResult.errorSummary ?? null,
                    },
                }),
            ]);
            return {
                ok: true,
                clientId,
                accountId,
                syncedPosts: postsSynced,
                syncedComments: commentsSynced,
                analyzedCount: analysisResult.analyzedCount,
                failedCount: analysisResult.failedCount,
            };
        }
        catch (error) {
            await this.prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: client_1.SyncRunStatus.failed,
                    finishedAt: new Date(),
                    error: error instanceof Error ? error.message : 'Unknown sync error',
                },
            });
            throw error;
        }
    }
    async analyzePendingCommentsForPosts(postIds) {
        if (postIds.length === 0) {
            return { analyzedCount: 0, failedCount: 0 };
        }
        const targets = await this.prisma.commentAnalysis.findMany({
            where: {
                postId: { in: postIds },
                status: { in: [client_1.AnalysisStatus.pending, client_1.AnalysisStatus.failed] },
            },
            include: { comment: true },
        });
        if (targets.length === 0) {
            return { analyzedCount: 0, failedCount: 0 };
        }
        try {
            const results = await this.ai.analyzeBatch(targets.map((item) => item.comment.text));
            let analyzedCount = 0;
            let failedCount = 0;
            const touchedPostIds = new Set();
            await this.prisma.$transaction(async (tx) => {
                for (let index = 0; index < targets.length; index += 1) {
                    const target = targets[index];
                    const result = results[index];
                    touchedPostIds.add(target.postId);
                    const analysisError = this.resolveAnalysisError(result);
                    if (analysisError) {
                        failedCount += 1;
                        await tx.commentAnalysis.update({
                            where: { id: target.id },
                            data: {
                                sentiment: null,
                                emotion: null,
                                confidence: null,
                                status: client_1.AnalysisStatus.failed,
                                analyzedAt: null,
                                error: analysisError,
                            },
                        });
                        continue;
                    }
                    analyzedCount += 1;
                    await tx.commentAnalysis.update({
                        where: { id: target.id },
                        data: {
                            sentiment: (0, mappers_1.sentimentFromEmotion)(result.predictedEmotion),
                            emotion: result.predictedEmotion,
                            confidence: result.confidence,
                            status: client_1.AnalysisStatus.analyzed,
                            analyzedAt: new Date(),
                            error: null,
                        },
                    });
                }
                for (const postId of touchedPostIds) {
                    const analyzedForPost = await tx.commentAnalysis.count({
                        where: { postId, status: client_1.AnalysisStatus.analyzed },
                    });
                    await tx.post.update({
                        where: { id: postId },
                        data: { analyzedComments: analyzedForPost },
                    });
                }
            });
            return {
                analyzedCount,
                failedCount,
                ...(failedCount > 0
                    ? { errorSummary: `AI analysis failed for ${failedCount} comments` }
                    : {}),
            };
        }
        catch (error) {
            this.ai.logFailure(error);
            await this.prisma.$transaction(async (tx) => {
                for (const target of targets) {
                    await tx.commentAnalysis.update({
                        where: { id: target.id },
                        data: {
                            sentiment: null,
                            emotion: null,
                            confidence: null,
                            status: client_1.AnalysisStatus.failed,
                            analyzedAt: null,
                            error: error instanceof Error ? error.message : 'AI request failed',
                        },
                    });
                }
            });
            this.logger.warn(`Sync completed with AI failures for ${targets.length} comments`);
            return {
                analyzedCount: 0,
                failedCount: targets.length,
                errorSummary: error instanceof Error
                    ? `AI request failed: ${error.message}`
                    : 'AI request failed',
            };
        }
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
    async retryRequest(action) {
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                return await action();
            }
            catch (error) {
                lastError = error;
                if (attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
                }
            }
        }
        throw lastError;
    }
    async graphGet(path, params) {
        const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.graphBase}${path}`, {
            params,
            timeout: 12000,
        }));
        return response.data;
    }
    parseGraphDate(value) {
        if (!value) {
            return new Date();
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    isRecentItem(value, lastSyncAt) {
        if (!lastSyncAt) {
            return true;
        }
        return value.getTime() > lastSyncAt.getTime();
    }
};
exports.InstagramService = InstagramService;
exports.InstagramService = InstagramService = InstagramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService,
        crypto_service_1.CryptoService,
        metrics_service_1.MetricsService,
        ai_service_1.AiService])
], InstagramService);
//# sourceMappingURL=instagram.service.js.map