import {
  AccountStatus,
  AnalysisStatus,
  ClientStatus,
  Prisma,
  Sentiment,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import {
  type ClientSummaryV2Response,
  type ClientDashboardSummary,
  type ClientStatusLabel,
  type PaginatedResult,
  type PostContract,
} from '../common/contracts';
import { mapClient, mapPost, parseClientStatus } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildClientAlerts,
  deltaPct,
  percentage,
  resolveHealth,
} from './client-summary-v2.logic';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientsQueryDto } from './dto/clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getClients(
    query: ClientsQueryDto,
  ): Promise<PaginatedResult<ReturnType<typeof mapClient>>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const status = parseClientStatus(query.status);

    const where: Prisma.ClientWhereInput = {
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
    const postAggregates =
      clientIds.length > 0
        ? await this.prisma.post.groupBy({
            by: ['clientId'],
            where: { clientId: { in: clientIds } },
            _count: { id: true },
            _sum: { commentsCount: true },
          })
        : [];

    const statsByClientId = new Map(
      postAggregates.map((row) => [
        row.clientId,
        {
          postCount: row._count.id ?? 0,
          commentCount: row._sum.commentsCount ?? 0,
        },
      ]),
    );

    return {
      items: items.map((item) =>
        mapClient(
          item,
          statsByClientId.get(item.id) ?? {
            postCount: 0,
            commentCount: 0,
          },
        ),
      ),
      total,
      page,
      pageSize,
    };
  }

  async getClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found`);
    }

    return mapClient(client);
  }

  async createClient(dto: CreateClientDto) {
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

    return mapClient(created);
  }

  async updateClient(clientId: string, dto: UpdateClientDto) {
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

    return mapClient(updated);
  }

  async deleteClient(clientId: string) {
    await this.ensureClientExists(clientId);

    await this.prisma.client.delete({
      where: { id: clientId },
    });

    return { ok: true, clientId };
  }

  async getClientSummary(clientId: string): Promise<ClientDashboardSummary> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found`);
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
    const commentCount = posts.reduce(
      (acc, post) => acc + post.commentsCount,
      0,
    );
    const avgEngagement =
      metrics.length > 0
        ? metrics.reduce((acc, metric) => acc + metric.engagement, 0) /
          metrics.length
        : 0;

    const positives = analyses.filter(
      (item) => item.sentiment === 'POSITIVO',
    ).length;
    const negatives = analyses.filter(
      (item) => item.sentiment === Sentiment.NEGATIVO,
    ).length;
    const totalAnalyzed = analyses.length;
    const positivePercent =
      totalAnalyzed > 0 ? Math.round((positives / totalAnalyzed) * 100) : 0;

    const emotionCount = new Map<string, number>();
    analyses.forEach((item) => {
      if (!item.emotion) return;
      emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
    });

    const emotionDistribution = [...emotionCount.entries()]
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage:
          totalAnalyzed > 0 ? Math.round((count / totalAnalyzed) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    const topPosts: PostContract[] = posts.slice(0, 5).map(mapPost);

    return {
      client: mapClient(client),
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

  async getClientSummaryV2(clientId: string): Promise<ClientSummaryV2Response> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found`);
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

    const analyzedCurrent = analysesCurrent.filter((item) => item.status === AnalysisStatus.analyzed).length;
    const analyzedPrevious = analysesPrevious.filter((item) => item.status === AnalysisStatus.analyzed).length;

    const pendingCurrent = analysesCurrent.filter((item) => item.status === AnalysisStatus.pending).length;

    const negativeCurrent = analysesCurrent.filter(
      (item) => item.status === AnalysisStatus.analyzed && item.sentiment === Sentiment.NEGATIVO,
    ).length;
    const analyzedForSentimentCurrent = analysesCurrent.filter(
      (item) => item.status === AnalysisStatus.analyzed,
    ).length;

    const negativePrevious = analysesPrevious.filter(
      (item) => item.status === AnalysisStatus.analyzed && item.sentiment === Sentiment.NEGATIVO,
    ).length;
    const analyzedForSentimentPrevious = analysesPrevious.filter(
      (item) => item.status === AnalysisStatus.analyzed,
    ).length;

    const connectedAccounts = accounts.filter((item) => item.status === AccountStatus.CONECTADO).length;
    const latestSyncAt = accounts
      .map((item) => item.lastSyncAt)
      .filter((item): item is Date => Boolean(item))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const staleSyncHours = latestSyncAt
      ? (Date.now() - latestSyncAt.getTime()) / (1000 * 60 * 60)
      : null;

    const coveragePct = percentage(analyzedCurrent, commentsCurrent);
    const negativePct = percentage(negativeCurrent, analyzedForSentimentCurrent);

    const alerts = buildClientAlerts({
      clientId,
      connectedAccounts,
      staleSyncHours,
      coveragePct,
      negativePct,
      pendingComments: pendingCurrent,
    });

    const emotionCount = new Map<string, number>();
    analysesCurrent.forEach((item) => {
      if (item.status !== 'analyzed' || !item.emotion) return;
      emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
    });

    const emotionTop = [...emotionCount.entries()]
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: percentage(count, analyzedCurrent),
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
        status: mapClient(client).status,
        avatarColor: client.avatarColor,
      },
      statusOverview: {
        health: resolveHealth({
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
          deltaPct: deltaPct(postsCurrent.length, postsPrevious.length),
          context: 'ultimos 30 dias',
        },
        {
          id: 'comments',
          label: 'Comentarios',
          value: formatNumber(commentsCurrent),
          deltaPct: deltaPct(commentsCurrent, commentsPrevious),
          context: 'ultimos 30 dias',
        },
        {
          id: 'coverage',
          label: 'Cobertura IA',
          value: `${coveragePct}%`,
          deltaPct: deltaPct(
            coveragePct,
            percentage(analyzedPrevious, commentsPrevious),
          ),
          context: 'analizados sobre total',
        },
        {
          id: 'negative',
          label: 'Negativos',
          value: `${negativePct}%`,
          deltaPct: deltaPct(
            negativePct,
            percentage(negativePrevious, analyzedForSentimentPrevious),
          ),
          context: 'sentimiento analizado',
        },
      ],
      comparison: {
        periodLabelCurrent: formatWindowLabel(windows.currentStart, windows.currentEnd),
        periodLabelPrevious: formatWindowLabel(windows.previousStart, new Date(windows.currentStart.getTime() - 1)),
      },
      emotionTop,
      recentPosts: postsCurrent.slice(0, 5).map(mapPost),
    };
  }

  private async resolveClientId(name: string): Promise<string> {
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

  private fromLabelToStatus(status?: ClientStatusLabel): ClientStatus {
    if (status === 'Pendiente') return ClientStatus.PENDIENTE;
    if (status === 'Sin cuenta') return ClientStatus.SIN_CUENTA;
    return ClientStatus.ACTIVO;
  }

  private async ensureClientExists(clientId: string): Promise<void> {
    const exists = await this.prisma.client.count({ where: { id: clientId } });
    if (!exists) {
      throw new NotFoundException(`Client '${clientId}' not found`);
    }
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function resolveComparisonWindows(now: Date): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
} {
  const currentEnd = now;
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { currentStart, currentEnd, previousStart };
}

function formatWindowLabel(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
  });

  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
