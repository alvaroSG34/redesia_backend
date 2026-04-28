import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@prisma/client';

import { AiBatchResult, AiService } from '../ai/ai.service';
import {
  type CommentsWorkbenchV2Response,
  type PostAnalysisSummary,
} from '../common/contracts';
import { formatPostDate, mapAnalysis, sentimentFromEmotion } from '../common/mappers';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly metricsService: MetricsService,
  ) {}

  async getPostCommentsAnalysis(postId: string) {
    const comments = await this.getCommentsWithAnalysis(postId);
    const summary = this.buildSummary(postId, comments);

    return {
      summary,
      comments: comments.map((row) => mapAnalysis(row, row.analysis)),
    };
  }

  async getCommentsWorkbenchV2(postId: string): Promise<CommentsWorkbenchV2Response> {
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
      throw new NotFoundException(`Post '${postId}' not found`);
    }

    const comments = await this.getCommentsWithAnalysis(postId);
    const summary = this.buildSummary(postId, comments);

    const items = comments.map((row) => {
      const mapped = mapAnalysis(row, row.analysis);

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

    const emotions = Array.from(
      new Set(
        items
          .map((item) => item.emotion)
          .filter((emotion) => emotion && emotion !== '-'),
      ),
    );

    const sentiments = Array.from(
      new Set(
        items
          .filter((item) => item.analysisStatus === 'analyzed')
          .map((item) => item.sentiment),
      ),
    );

    return {
      header: {
        postId,
        clientId: post.client.id,
        clientName: post.client.name,
        postCaption: post.caption,
        publishedAt: formatPostDate(post.publishedAt),
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

  async analyzePostComments(postId: string) {
    const comments = await this.getCommentsWithAnalysis(postId);
    const pending = comments.filter(
      (row) => row.analysis?.status !== AnalysisStatus.analyzed,
    );

    if (pending.length === 0) {
      return this.getPostCommentsAnalysis(postId);
    }

    await this.analyzeRows(postId, pending);
    await this.metricsService.recomputePostMetric(postId);
    return this.getPostCommentsAnalysis(postId);
  }

  async reanalyzeComment(postId: string, commentId: string) {
    const target = await this.prisma.comment.findFirst({
      where: { id: commentId, postId },
      include: { analysis: true },
    });

    if (!target) {
      throw new NotFoundException(
        `Comment '${commentId}' not found for post '${postId}'`,
      );
    }

    await this.analyzeRows(postId, [target]);
    await this.metricsService.recomputePostMetric(postId);
    return this.getCommentsWorkbenchV2(postId);
  }

  private async analyzeRows(
    postId: string,
    rows: Array<{
      id: string;
      text: string;
      analysis: { status: AnalysisStatus } | null;
    }>,
  ) {
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
                status: AnalysisStatus.failed,
                retryCount: 1,
                lastAttemptAt: attemptAt,
                error: analysisError,
              },
              update: {
                sentiment: null,
                emotion: null,
                confidence: null,
                status: AnalysisStatus.failed,
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
              sentiment: sentimentFromEmotion(result.predictedEmotion),
              emotion: result.predictedEmotion,
              confidence: result.confidence,
              status: AnalysisStatus.analyzed,
              analyzedAt: attemptAt,
              retryCount: 1,
              lastAttemptAt: attemptAt,
            },
            update: {
              sentiment: sentimentFromEmotion(result.predictedEmotion),
              emotion: result.predictedEmotion,
              confidence: result.confidence,
              status: AnalysisStatus.analyzed,
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
          where: { postId, status: AnalysisStatus.analyzed },
        });

        await tx.post.update({
          where: { id: postId },
          data: { analyzedComments: analyzedCount },
        });
      });
    } catch (error) {
      this.ai.logFailure(error);

      await this.prisma.$transaction(async (tx) => {
        for (const source of rows) {
          const attemptAt = new Date();

          await tx.commentAnalysis.upsert({
            where: { commentId: source.id },
            create: {
              commentId: source.id,
              postId,
              status: AnalysisStatus.failed,
              retryCount: 1,
              lastAttemptAt: attemptAt,
              error: error instanceof Error ? error.message : 'AI request failed',
            },
            update: {
              status: AnalysisStatus.failed,
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

  private async getCommentsWithAnalysis(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private resolveAnalysisError(result?: AiBatchResult): string | null {
    if (!result) {
      return 'Missing IA result for comment';
    }

    if (!result.predictedEmotion) {
      return result.error ?? 'Emotion not classifiable';
    }

    return null;
  }

  private buildSummary(
    postId: string,
    comments: Array<{
      analysis: {
        sentiment: string | null;
        emotion: string | null;
        status: AnalysisStatus;
      } | null;
    }>,
  ): PostAnalysisSummary {
    const valid = comments
      .map((row) => row.analysis)
      .filter(Boolean) as Array<{
      sentiment: string | null;
      emotion: string | null;
      status: AnalysisStatus;
    }>;

    const analyzed = valid.filter(
      (item) => item.status === AnalysisStatus.analyzed,
    );

    const emotionCount = new Map<string, number>();
    analyzed.forEach((item) => {
      if (!item.emotion) return;
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
}
