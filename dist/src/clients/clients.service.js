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
exports.ClientsService = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mappers_1 = require("../common/mappers");
const prisma_service_1 = require("../prisma/prisma.service");
const client_summary_v2_logic_1 = require("./client-summary-v2.logic");
let ClientsService = class ClientsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getClients(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 12;
        const status = (0, mappers_1.parseClientStatus)(query.status);
        const where = {
            ...(status ? { status } : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { industry: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                        { shortName: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.client.count({ where }),
            this.prisma.client.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        const clientIds = items.map((item) => item.id);
        const postAggregates = clientIds.length > 0
            ? await this.prisma.post.groupBy({
                by: ['clientId'],
                where: { clientId: { in: clientIds } },
                _count: { id: true },
                _sum: { commentsCount: true },
            })
            : [];
        const statsByClientId = new Map(postAggregates.map((row) => [
            row.clientId,
            {
                postCount: row._count.id ?? 0,
                commentCount: row._sum.commentsCount ?? 0,
            },
        ]));
        return {
            items: items.map((item) => (0, mappers_1.mapClient)(item, statsByClientId.get(item.id) ?? {
                postCount: 0,
                commentCount: 0,
            })),
            total,
            page,
            pageSize,
        };
    }
    async getClient(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
        return (0, mappers_1.mapClient)(client);
    }
    async createClient(dto) {
        const id = await this.resolveClientId(dto.name);
        const created = await this.prisma.client.create({
            data: {
                id,
                name: dto.name,
                shortName: dto.shortName,
                industry: dto.industry,
                description: dto.description ?? '',
                status: this.fromLabelToStatus(dto.status),
                connected: dto.connected ?? false,
                avatarColor: dto.avatarColor ?? '#2563eb',
            },
        });
        return (0, mappers_1.mapClient)(created);
    }
    async updateClient(clientId, dto) {
        await this.ensureClientExists(clientId);
        const updated = await this.prisma.client.update({
            where: { id: clientId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
                ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
                ...(dto.description !== undefined
                    ? { description: dto.description }
                    : {}),
                ...(dto.connected !== undefined ? { connected: dto.connected } : {}),
                ...(dto.avatarColor !== undefined
                    ? { avatarColor: dto.avatarColor }
                    : {}),
                ...(dto.status !== undefined
                    ? { status: this.fromLabelToStatus(dto.status) }
                    : {}),
            },
        });
        return (0, mappers_1.mapClient)(updated);
    }
    async deleteClient(clientId) {
        await this.ensureClientExists(clientId);
        await this.prisma.client.delete({
            where: { id: clientId },
        });
        return { ok: true, clientId };
    }
    async getClientSummary(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
        const [posts, metrics, analyses] = await Promise.all([
            this.prisma.post.findMany({
                where: { clientId },
                orderBy: { publishedAt: 'desc' },
            }),
            this.prisma.postMetric.findMany({ where: { clientId } }),
            this.prisma.commentAnalysis.findMany({
                where: {
                    post: { clientId },
                    status: 'analyzed',
                },
            }),
        ]);
        const postCount = posts.length;
        const commentCount = posts.reduce((acc, post) => acc + post.commentsCount, 0);
        const avgEngagement = metrics.length > 0
            ? metrics.reduce((acc, metric) => acc + metric.engagement, 0) /
                metrics.length
            : 0;
        const positives = analyses.filter((item) => item.sentiment === 'POSITIVO').length;
        const negatives = analyses.filter((item) => item.sentiment === client_1.Sentiment.NEGATIVO).length;
        const totalAnalyzed = analyses.length;
        const positivePercent = totalAnalyzed > 0 ? Math.round((positives / totalAnalyzed) * 100) : 0;
        const emotionCount = new Map();
        analyses.forEach((item) => {
            if (!item.emotion)
                return;
            emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
        });
        const emotionDistribution = [...emotionCount.entries()]
            .map(([emotion, count]) => ({
            emotion,
            count,
            percentage: totalAnalyzed > 0 ? Math.round((count / totalAnalyzed) * 100) : 0,
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
        const topPosts = posts.slice(0, 5).map(mappers_1.mapPost);
        return {
            client: (0, mappers_1.mapClient)(client),
            kpis: [
                {
                    id: 'posts',
                    label: 'Publicaciones',
                    value: String(postCount),
                    delta: '+0',
                    context: 'ultimo mes',
                },
                {
                    id: 'comments',
                    label: 'Comentarios',
                    value: String(commentCount),
                    delta: '+0%',
                    context: 'ultimo mes',
                },
                {
                    id: 'engagement',
                    label: 'Engagement',
                    value: `${(avgEngagement * 100).toFixed(1)}%`,
                    delta: '+0.0',
                    context: 'promedio',
                },
                {
                    id: 'sentiment',
                    label: 'Positivos',
                    value: `${positivePercent}%`,
                    delta: `${positives - negatives >= 0 ? '+' : ''}${positives - negatives}%`,
                    context: 'comentarios',
                },
            ],
            emotionDistribution,
            topPosts,
        };
    }
    async getClientSummaryV2(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
        const now = new Date();
        const windows = resolveComparisonWindows(now);
        const [accounts, postsCurrent, postsPrevious, analysesRaw] = await Promise.all([
            this.prisma.socialAccount.findMany({
                where: { clientId },
                select: {
                    id: true,
                    status: true,
                    lastSyncAt: true,
                },
            }),
            this.prisma.post.findMany({
                where: {
                    clientId,
                    publishedAt: {
                        gte: windows.currentStart,
                        lte: windows.currentEnd,
                    },
                },
                orderBy: { publishedAt: 'desc' },
            }),
            this.prisma.post.findMany({
                where: {
                    clientId,
                    publishedAt: {
                        gte: windows.previousStart,
                        lt: windows.currentStart,
                    },
                },
            }),
            this.prisma.commentAnalysis.findMany({
                where: {
                    post: { clientId },
                },
                select: {
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
        const analysesCurrent = analysesRaw.filter((item) => {
            const createdAt = item.comment.createdAt;
            return createdAt >= windows.currentStart && createdAt <= windows.currentEnd;
        });
        const analysesPrevious = analysesRaw.filter((item) => {
            const createdAt = item.comment.createdAt;
            return createdAt >= windows.previousStart && createdAt < windows.currentStart;
        });
        const commentsCurrent = analysesCurrent.length;
        const commentsPrevious = analysesPrevious.length;
        const analyzedCurrent = analysesCurrent.filter((item) => item.status === client_1.AnalysisStatus.analyzed).length;
        const analyzedPrevious = analysesPrevious.filter((item) => item.status === client_1.AnalysisStatus.analyzed).length;
        const pendingCurrent = analysesCurrent.filter((item) => item.status === client_1.AnalysisStatus.pending).length;
        const negativeCurrent = analysesCurrent.filter((item) => item.status === client_1.AnalysisStatus.analyzed && item.sentiment === client_1.Sentiment.NEGATIVO).length;
        const analyzedForSentimentCurrent = analysesCurrent.filter((item) => item.status === client_1.AnalysisStatus.analyzed).length;
        const negativePrevious = analysesPrevious.filter((item) => item.status === client_1.AnalysisStatus.analyzed && item.sentiment === client_1.Sentiment.NEGATIVO).length;
        const analyzedForSentimentPrevious = analysesPrevious.filter((item) => item.status === client_1.AnalysisStatus.analyzed).length;
        const connectedAccounts = accounts.filter((item) => item.status === client_1.AccountStatus.CONECTADO).length;
        const latestSyncAt = accounts
            .map((item) => item.lastSyncAt)
            .filter((item) => Boolean(item))
            .sort((a, b) => b.getTime() - a.getTime())[0];
        const staleSyncHours = latestSyncAt
            ? (Date.now() - latestSyncAt.getTime()) / (1000 * 60 * 60)
            : null;
        const coveragePct = (0, client_summary_v2_logic_1.percentage)(analyzedCurrent, commentsCurrent);
        const negativePct = (0, client_summary_v2_logic_1.percentage)(negativeCurrent, analyzedForSentimentCurrent);
        const alerts = (0, client_summary_v2_logic_1.buildClientAlerts)({
            clientId,
            connectedAccounts,
            staleSyncHours,
            coveragePct,
            negativePct,
            pendingComments: pendingCurrent,
        });
        const emotionCount = new Map();
        analysesCurrent.forEach((item) => {
            if (item.status !== 'analyzed' || !item.emotion)
                return;
            emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
        });
        const emotionTop = [...emotionCount.entries()]
            .map(([emotion, count]) => ({
            emotion,
            count,
            percentage: (0, client_summary_v2_logic_1.percentage)(count, analyzedCurrent),
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
        return {
            clientHeader: {
                id: client.id,
                name: client.name,
                shortName: client.shortName,
                industry: client.industry,
                connected: client.connected,
                status: (0, mappers_1.mapClient)(client).status,
                avatarColor: client.avatarColor,
            },
            statusOverview: {
                health: (0, client_summary_v2_logic_1.resolveHealth)({
                    clientId,
                    connectedAccounts,
                    staleSyncHours,
                    coveragePct,
                    negativePct,
                    pendingComments: pendingCurrent,
                }),
                coveragePct,
                negativePct,
                pendingComments: pendingCurrent,
                lastSyncAt: latestSyncAt ? latestSyncAt.toISOString() : null,
                connectedAccounts,
            },
            alerts,
            kpis: [
                {
                    id: 'posts',
                    label: 'Publicaciones',
                    value: formatNumber(postsCurrent.length),
                    deltaPct: (0, client_summary_v2_logic_1.deltaPct)(postsCurrent.length, postsPrevious.length),
                    context: 'ultimos 30 dias',
                },
                {
                    id: 'comments',
                    label: 'Comentarios',
                    value: formatNumber(commentsCurrent),
                    deltaPct: (0, client_summary_v2_logic_1.deltaPct)(commentsCurrent, commentsPrevious),
                    context: 'ultimos 30 dias',
                },
                {
                    id: 'coverage',
                    label: 'Cobertura IA',
                    value: `${coveragePct}%`,
                    deltaPct: (0, client_summary_v2_logic_1.deltaPct)(coveragePct, (0, client_summary_v2_logic_1.percentage)(analyzedPrevious, commentsPrevious)),
                    context: 'analizados sobre total',
                },
                {
                    id: 'negative',
                    label: 'Negativos',
                    value: `${negativePct}%`,
                    deltaPct: (0, client_summary_v2_logic_1.deltaPct)(negativePct, (0, client_summary_v2_logic_1.percentage)(negativePrevious, analyzedForSentimentPrevious)),
                    context: 'sentimiento analizado',
                },
            ],
            comparison: {
                periodLabelCurrent: formatWindowLabel(windows.currentStart, windows.currentEnd),
                periodLabelPrevious: formatWindowLabel(windows.previousStart, new Date(windows.currentStart.getTime() - 1)),
            },
            emotionTop,
            recentPosts: postsCurrent.slice(0, 5).map(mappers_1.mapPost),
        };
    }
    async resolveClientId(name) {
        const base = slugify(name);
        const existing = await this.prisma.client.findFirst({
            where: { id: base },
        });
        if (!existing) {
            return base;
        }
        let index = 2;
        while (true) {
            const candidate = `${base}-${index}`;
            const found = await this.prisma.client.findFirst({
                where: { id: candidate },
            });
            if (!found) {
                return candidate;
            }
            index += 1;
        }
    }
    fromLabelToStatus(status) {
        if (status === 'Pendiente')
            return client_1.ClientStatus.PENDIENTE;
        if (status === 'Sin cuenta')
            return client_1.ClientStatus.SIN_CUENTA;
        return client_1.ClientStatus.ACTIVO;
    }
    async ensureClientExists(clientId) {
        const exists = await this.prisma.client.count({ where: { id: clientId } });
        if (!exists) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
function slugify(value) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function resolveComparisonWindows(now) {
    const currentEnd = now;
    const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { currentStart, currentEnd, previousStart };
}
function formatWindowLabel(start, end) {
    const fmt = new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'short',
    });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
}
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}
//# sourceMappingURL=clients.service.js.map