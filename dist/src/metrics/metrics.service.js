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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MetricsService = class MetricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getClientMetrics(clientId) {
        const [posts, metrics] = await Promise.all([
            this.prisma.post.findMany({ where: { clientId } }),
            this.prisma.postMetric.findMany({ where: { clientId } }),
        ]);
        const totalPosts = posts.length;
        const totalComments = posts.reduce((acc, post) => acc + post.commentsCount, 0);
        const totalLikes = posts.reduce((acc, post) => acc + post.likes, 0);
        const positive = metrics.reduce((acc, metric) => acc + metric.positive, 0);
        const negative = metrics.reduce((acc, metric) => acc + metric.negative, 0);
        const neutral = metrics.reduce((acc, metric) => acc + metric.neutral, 0);
        const sentimentTotal = positive + negative + neutral;
        return {
            clientId,
            totals: {
                posts: totalPosts,
                comments: totalComments,
                likes: totalLikes,
            },
            sentiment: {
                positive,
                neutral,
                negative,
                positivePct: sentimentTotal
                    ? Math.round((positive / sentimentTotal) * 100)
                    : 0,
                neutralPct: sentimentTotal
                    ? Math.round((neutral / sentimentTotal) * 100)
                    : 0,
                negativePct: sentimentTotal
                    ? Math.round((negative / sentimentTotal) * 100)
                    : 0,
            },
            postMetrics: metrics,
        };
    }
    async recomputePostMetric(postId) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            return;
        }
        const analyses = await this.prisma.commentAnalysis.findMany({
            where: { postId },
        });
        const positive = analyses.filter((row) => row.sentiment === 'POSITIVO').length;
        const negative = analyses.filter((row) => row.sentiment === 'NEGATIVO').length;
        const neutral = analyses.filter((row) => row.sentiment === 'NEUTRAL').length;
        const engagement = Number(((post.likes + post.commentsCount) /
            Math.max(1, post.likes + post.commentsCount + 1000)).toFixed(4));
        await this.prisma.postMetric.upsert({
            where: { postId },
            create: {
                postId,
                clientId: post.clientId,
                likes: post.likes,
                comments: post.commentsCount,
                engagement,
                positive,
                negative,
                neutral,
            },
            update: {
                likes: post.likes,
                comments: post.commentsCount,
                engagement,
                positive,
                negative,
                neutral,
            },
        });
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map