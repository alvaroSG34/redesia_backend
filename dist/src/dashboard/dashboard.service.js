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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const mappers_1 = require("../common/mappers");
const prisma_service_1 = require("../prisma/prisma.service");
const dashboard_v2_logic_1 = require("./dashboard-v2.logic");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(search = '') {
        const [totalClients, posts, analyzedCount, clients, emotions] = await Promise.all([
            this.prisma.client.count(),
            this.prisma.post.findMany({
                select: { likes: true, commentsCount: true },
            }),
            this.prisma.commentAnalysis.count({ where: { status: 'analyzed' } }),
            this.prisma.client.findMany({
                where: search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { industry: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : undefined,
                take: 6,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.commentAnalysis.groupBy({
                by: ['emotion'],
                where: {
                    status: 'analyzed',
                    emotion: { not: null },
                },
                _count: { emotion: true },
                orderBy: { _count: { emotion: 'desc' } },
                take: 7,
            }),
        ]);
        const totalPosts = posts.length;
        const totalComments = posts.reduce((acc, post) => acc + post.commentsCount, 0);
        const emotionTotal = emotions.reduce((acc, row) => acc + (row._count.emotion ?? 0), 0);
        return {
            kpis: [
                {
                    id: 'total-clients',
                    label: 'Total Clientes',
                    value: formatNumber(totalClients),
                    delta: '+0%',
                    context: 'vs. mes anterior',
                },
                {
                    id: 'total-posts',
                    label: 'Publicaciones',
                    value: formatNumber(totalPosts),
                    delta: '+0%',
                    context: 'ultimos 30 dias',
                },
                {
                    id: 'total-comments',
                    label: 'Comentarios',
                    value: formatNumber(totalComments),
                    delta: '+0%',
                    context: 'ultimos 30 dias',
                },
                {
                    id: 'analyzed-comments',
                    label: 'Analizados',
                    value: formatNumber(analyzedCount),
                    delta: '+0%',
                    context: 'procesados por IA',
                },
            ],
            recentClients: clients.map((client) => (0, mappers_1.mapClient)(client)),
            trendingEmotions: emotions.map((row) => ({
                emotion: row.emotion ?? 'Unknown',
                count: row._count.emotion ?? 0,
                percentage: emotionTotal > 0
                    ? Math.round(((row._count.emotion ?? 0) / emotionTotal) * 100)
                    : 0,
            })),
        };
    }
    async getDashboardV2(search = '', range = '30d') {
        const clientWhere = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { industry: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }
            : undefined;
        const clients = await this.prisma.client.findMany({
            where: clientWhere,
            orderBy: { createdAt: 'desc' },
        });
        if (!clients.length) {
            return {
                overview: {
                    clientsTotal: 0,
                    connectedAccounts: 0,
                    postsTotal: 0,
                    commentsTotal: 0,
                    analyzedTotal: 0,
                    analysisCoveragePct: 0,
                },
                alerts: [],
                todayActions: (0, dashboard_v2_logic_1.buildTodayActions)([]),
                sentimentTrend: [],
                emotionTop: [],
                clientsHealth: [],
            };
        }
        const clientIds = clients.map((client) => client.id);
        const window = resolveWindow(range, new Date());
        const [posts, accounts, analyses] = await Promise.all([
            this.prisma.post.findMany({
                where: {
                    clientId: { in: clientIds },
                    publishedAt: {
                        gte: window.start,
                        lte: window.end,
                    },
                },
                select: {
                    id: true,
                    clientId: true,
                },
            }),
            this.prisma.socialAccount.findMany({
                where: {
                    clientId: { in: clientIds },
                },
                select: {
                    clientId: true,
                    status: true,
                    lastSyncAt: true,
                },
            }),
            this.prisma.commentAnalysis.findMany({
                where: {
                    post: {
                        clientId: { in: clientIds },
                    },
                },
                select: {
                    postId: true,
                    status: true,
                    sentiment: true,
                    emotion: true,
                    comment: {
                        select: {
                            createdAt: true,
                        },
                    },
                },
            }),
        ]);
        const postById = new Map(posts.map((post) => [post.id, post]));
        const analysesInRange = analyses.filter((analysis) => {
            const createdAt = analysis.comment.createdAt;
            if (createdAt < window.start || createdAt > window.end) {
                return false;
            }
            return postById.has(analysis.postId);
        });
        const postsTotal = posts.length;
        const commentsTotal = analysesInRange.length;
        const analyzedTotal = analysesInRange.filter((analysis) => analysis.status === client_1.AnalysisStatus.analyzed).length;
        const connectedAccounts = accounts.filter((account) => account.status === 'CONECTADO').length;
        const analysisCoveragePct = (0, dashboard_v2_logic_1.getCoveragePercentage)(commentsTotal, analyzedTotal);
        const postToClient = new Map(posts.map((post) => [post.id, post.clientId]));
        const clientsHealthInput = clients.map((client) => {
            const accountItems = accounts.filter((item) => item.clientId === client.id);
            const latestSyncAt = accountItems
                .map((item) => item.lastSyncAt)
                .filter((item) => Boolean(item))
                .sort((a, b) => b.getTime() - a.getTime())[0];
            const staleSyncHours = latestSyncAt
                ? (Date.now() - latestSyncAt.getTime()) / (1000 * 60 * 60)
                : null;
            const byClient = analysesInRange.filter((analysis) => {
                return postToClient.get(analysis.postId) === client.id;
            });
            const pendingComments = byClient.filter((analysis) => analysis.status === client_1.AnalysisStatus.pending).length;
            const analyzed = byClient.filter((analysis) => analysis.status === client_1.AnalysisStatus.analyzed);
            const negativeCount = analyzed.filter((analysis) => analysis.sentiment === client_1.Sentiment.NEGATIVO).length;
            const negativeRatePct = (0, dashboard_v2_logic_1.getCoveragePercentage)(analyzed.length, negativeCount);
            return {
                clientId: client.id,
                name: client.name,
                pendingComments,
                negativeRatePct,
                staleSyncHours,
            };
        });
        const clientsHealth = clients
            .map((client) => {
            const health = clientsHealthInput.find((item) => item.clientId === client.id);
            const accountItems = accounts.filter((item) => item.clientId === client.id);
            const latestSyncAt = accountItems
                .map((item) => item.lastSyncAt)
                .filter((item) => Boolean(item))
                .sort((a, b) => b.getTime() - a.getTime())[0];
            return {
                clientId: client.id,
                name: client.name,
                status: (0, mappers_1.mapClientStatus)(client.status),
                connected: client.connected,
                lastSyncAt: latestSyncAt ? latestSyncAt.toISOString() : null,
                pendingComments: health?.pendingComments ?? 0,
                negativeRatePct: health?.negativeRatePct ?? 0,
                riskLevel: (0, dashboard_v2_logic_1.resolveRiskLevel)(health ?? {
                    clientId: client.id,
                    name: client.name,
                    pendingComments: 0,
                    negativeRatePct: 0,
                    staleSyncHours: null,
                }),
            };
        })
            .sort((a, b) => {
            const inputA = clientsHealthInput.find((item) => item.clientId === a.clientId);
            const inputB = clientsHealthInput.find((item) => item.clientId === b.clientId);
            const scoreA = inputA ? (0, dashboard_v2_logic_1.getRiskScore)(inputA) : 0;
            const scoreB = inputB ? (0, dashboard_v2_logic_1.getRiskScore)(inputB) : 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            if (b.pendingComments !== a.pendingComments) {
                return b.pendingComments - a.pendingComments;
            }
            return b.negativeRatePct - a.negativeRatePct;
        })
            .slice(0, 6);
        const alerts = (0, dashboard_v2_logic_1.buildAlerts)(clientsHealthInput, analysisCoveragePct);
        const todayActions = (0, dashboard_v2_logic_1.buildTodayActions)(alerts);
        const sentimentEntries = analysesInRange
            .filter((analysis) => analysis.status === client_1.AnalysisStatus.analyzed &&
            analysis.sentiment !== null)
            .map((analysis) => ({
            createdAt: analysis.comment.createdAt,
            sentiment: analysis.sentiment ?? client_1.Sentiment.NEUTRAL,
        }));
        const sentimentTrend = (0, dashboard_v2_logic_1.buildSentimentTrend)(sentimentEntries, window);
        const emotionCounter = new Map();
        for (const analysis of analysesInRange) {
            if (analysis.status !== client_1.AnalysisStatus.analyzed || !analysis.emotion) {
                continue;
            }
            const current = emotionCounter.get(analysis.emotion) ?? 0;
            emotionCounter.set(analysis.emotion, current + 1);
        }
        const emotionTotal = Array.from(emotionCounter.values()).reduce((acc, value) => acc + value, 0);
        const emotionTop = Array.from(emotionCounter.entries())
            .map(([emotion, count]) => ({
            emotion,
            count,
            percentage: emotionTotal > 0 ? Math.round((count / emotionTotal) * 100) : 0,
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
        return {
            overview: {
                clientsTotal: clients.length,
                connectedAccounts,
                postsTotal,
                commentsTotal,
                analyzedTotal,
                analysisCoveragePct,
            },
            alerts,
            todayActions,
            sentimentTrend,
            emotionTop,
            clientsHealth,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}
function resolveWindow(range, now) {
    const end = now;
    if (range === '7d') {
        return {
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            end,
        };
    }
    if (range === 'month') {
        return {
            start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
            end,
        };
    }
    return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end,
    };
}
//# sourceMappingURL=dashboard.service.js.map