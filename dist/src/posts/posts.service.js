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
exports.PostsService = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mappers_1 = require("../common/mappers");
const prisma_service_1 = require("../prisma/prisma.service");
const post_detail_v2_logic_1 = require("./post-detail-v2.logic");
let PostsService = class PostsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPosts(clientId) {
        const posts = await this.prisma.post.findMany({
            where: { clientId },
            orderBy: { publishedAt: 'desc' },
        });
        return posts.map(mappers_1.mapPost);
    }
    async getPost(clientId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, clientId },
        });
        if (!post) {
            throw new common_1.NotFoundException(`Post '${postId}' not found for client '${clientId}'`);
        }
        return (0, mappers_1.mapPost)(post);
    }
    async getPostDetailV2(clientId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, clientId },
            include: {
                client: true,
                account: true,
            },
        });
        if (!post) {
            throw new common_1.NotFoundException(`Post '${postId}' not found for client '${clientId}'`);
        }
        const windows = (0, post_detail_v2_logic_1.resolveComparisonWindows)();
        const [analysesCurrent, analysesPrevious, previousPosts] = await Promise.all([
            this.prisma.commentAnalysis.findMany({
                where: {
                    postId,
                    status: client_1.AnalysisStatus.analyzed,
                    comment: {
                        createdAt: {
                            gte: windows.currentStart,
                            lte: windows.currentEnd,
                        },
                    },
                },
                select: {
                    sentiment: true,
                    emotion: true,
                },
            }),
            this.prisma.commentAnalysis.findMany({
                where: {
                    postId,
                    status: client_1.AnalysisStatus.analyzed,
                    comment: {
                        createdAt: {
                            gte: windows.previousStart,
                            lte: windows.previousEnd,
                        },
                    },
                },
                select: {
                    sentiment: true,
                },
            }),
            this.prisma.post.findMany({
                where: {
                    clientId,
                    publishedAt: {
                        gte: windows.previousStart,
                        lte: windows.previousEnd,
                    },
                },
                select: {
                    likes: true,
                    commentsCount: true,
                },
            }),
        ]);
        const analyzedComments = Math.max(0, post.analyzedComments);
        const commentsTotal = Math.max(0, post.commentsCount);
        const pendingComments = Math.max(0, commentsTotal - analyzedComments);
        const positive = analysesCurrent.filter((item) => item.sentiment === client_1.Sentiment.POSITIVO).length;
        const negative = analysesCurrent.filter((item) => item.sentiment === client_1.Sentiment.NEGATIVO).length;
        const neutral = analysesCurrent.filter((item) => item.sentiment === client_1.Sentiment.NEUTRAL).length;
        const analyzedCurrent = analysesCurrent.length;
        const positivePct = (0, post_detail_v2_logic_1.percentage)(positive, analyzedCurrent);
        const negativePct = (0, post_detail_v2_logic_1.percentage)(negative, analyzedCurrent);
        const neutralPct = (0, post_detail_v2_logic_1.percentage)(neutral, analyzedCurrent);
        const negativePrevious = analysesPrevious.filter((item) => item.sentiment === client_1.Sentiment.NEGATIVO).length;
        const negativePreviousPct = (0, post_detail_v2_logic_1.percentage)(negativePrevious, analysesPrevious.length);
        const emotionCount = new Map();
        analysesCurrent.forEach((item) => {
            if (!item.emotion)
                return;
            emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
        });
        const topEmotion = [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const previousLikesBaseline = previousPosts.length > 0
            ? Math.round(previousPosts.reduce((acc, row) => acc + row.likes, 0) /
                previousPosts.length)
            : 0;
        const previousCommentsBaseline = previousPosts.length > 0
            ? Math.round(previousPosts.reduce((acc, row) => acc + row.commentsCount, 0) /
                previousPosts.length)
            : 0;
        return {
            postHeader: {
                postId: post.id,
                clientId: post.clientId,
                clientName: post.client.name,
                caption: post.caption,
                publishedAt: (0, mappers_1.formatPostDate)(post.publishedAt),
                mediaType: (0, post_detail_v2_logic_1.normalizeMediaType)(post.imageHint),
                imageUrl: post.imageUrl ?? null,
                accountHandle: post.account?.handle ?? 'Cuenta no disponible',
                accountPlatform: post.account?.platform ?? 'Plataforma no disponible',
                accountStatus: post.account
                    ? (0, mappers_1.mapAccountStatus)(post.account.status)
                    : 'Cuenta no disponible',
            },
            performance: {
                likes: post.likes,
                commentsTotal,
                analyzedComments,
                pendingComments,
                analysisStatus: (0, post_detail_v2_logic_1.resolveAnalysisStatus)(analyzedComments, commentsTotal),
            },
            sentiment: {
                label: (0, post_detail_v2_logic_1.resolveSentimentLabel)({ positive, negative, neutral }),
                positivePct,
                negativePct,
                neutralPct,
                topEmotion,
            },
            comparison: {
                periodLabelCurrent: (0, post_detail_v2_logic_1.formatWindowLabel)(windows.currentStart, windows.currentEnd),
                periodLabelPrevious: (0, post_detail_v2_logic_1.formatWindowLabel)(windows.previousStart, windows.previousEnd),
                likesDeltaPct: (0, post_detail_v2_logic_1.deltaPct)(post.likes, previousLikesBaseline),
                commentsDeltaPct: (0, post_detail_v2_logic_1.deltaPct)(commentsTotal, previousCommentsBaseline),
                negativePctDelta: (0, post_detail_v2_logic_1.deltaPct)(negativePct, negativePreviousPct),
            },
            actions: {
                primary: {
                    label: 'Ver comentarios',
                    href: `/clients/${clientId}/posts/${postId}/comments`,
                },
                secondary: [
                    {
                        label: 'Volver a publicaciones',
                        href: `/clients/${clientId}/posts`,
                        intent: 'secondary',
                    },
                    {
                        label: 'Ver cuentas',
                        href: `/clients/${clientId}/accounts`,
                        intent: 'neutral',
                    },
                ],
            },
        };
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostsService);
//# sourceMappingURL=posts.service.js.map