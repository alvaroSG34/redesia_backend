import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  AnalysisStatus,
  ClientStatus,
  SyncRunStatus,
  SyncTrigger,
} from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { AiBatchResult, AiService } from '../ai/ai.service';
import { sentimentFromEmotion } from '../common/mappers';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../security/crypto.service';

interface GraphMedia {
  id: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_url?: string;
}

interface GraphComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
}

interface SyncAnalysisResult {
  analyzedCount: number;
  failedCount: number;
  errorSummary?: string;
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly graphBase = 'https://graph.facebook.com/v22.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly crypto: CryptoService,
    private readonly metrics: MetricsService,
    private readonly ai: AiService,
  ) {}

  async syncAccount(
    clientId: string,
    accountId: string,
    trigger: SyncTrigger = SyncTrigger.manual,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, clientId },
      include: { token: true },
    });

    if (!account) {
      throw new NotFoundException(
        `Account '${accountId}' not found for client '${clientId}'`,
      );
    }

    const syncRun = await this.prisma.syncRun.create({
      data: {
        trigger,
        status: SyncRunStatus.running,
        clientId,
        accountId,
      },
    });

    try {
      if (
        !account.token?.encryptedLongLivedToken &&
        !account.token?.encryptedAccessToken
      ) {
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
        return this.graphGet<{ data: GraphMedia[] }>(`/${igBusinessId}/media`, {
          fields:
            'id,caption,timestamp,like_count,comments_count,media_type,media_url',
          access_token: token,
        });
      });

      const media = mediaResponse.data ?? [];
      let postsSynced = 0;
      let commentsSynced = 0;
      const syncedPostIds = new Set<string>();

      for (const item of media) {
        if (!item.id) continue;
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
          return this.graphGet<{ data: GraphComment[] }>(`/${item.id}/comments`, {
            fields: 'id,text,username,timestamp,like_count',
            order: 'reverse_chronological',
            limit: '100',
            access_token: token,
          });
        });

        const comments = commentResponse.data ?? [];

        for (const comment of comments) {
          if (!comment.id) continue;

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
              status: AnalysisStatus.pending,
            },
            update: {
              status: AnalysisStatus.pending,
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
            status: AccountStatus.CONECTADO,
            lastSyncAt: new Date(),
          },
        }),
        this.prisma.client.update({
          where: { id: clientId },
          data: { connected: true, status: ClientStatus.ACTIVO },
        }),
        this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: SyncRunStatus.success,
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
    } catch (error) {
      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: SyncRunStatus.failed,
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown sync error',
        },
      });
      throw error;
    }
  }

  private async analyzePendingCommentsForPosts(
    postIds: string[],
  ): Promise<SyncAnalysisResult> {
    if (postIds.length === 0) {
      return { analyzedCount: 0, failedCount: 0 };
    }

    const targets = await this.prisma.commentAnalysis.findMany({
      where: {
        postId: { in: postIds },
        status: { in: [AnalysisStatus.pending, AnalysisStatus.failed] },
      },
      include: { comment: true },
    });

    if (targets.length === 0) {
      return { analyzedCount: 0, failedCount: 0 };
    }

    try {
      const results = await this.ai.analyzeBatch(
        targets.map((item) => item.comment.text),
      );

      let analyzedCount = 0;
      let failedCount = 0;
      const touchedPostIds = new Set<string>();

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
                status: AnalysisStatus.failed,
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
              sentiment: sentimentFromEmotion(result.predictedEmotion),
              emotion: result.predictedEmotion,
              confidence: result.confidence,
              status: AnalysisStatus.analyzed,
              analyzedAt: new Date(),
              error: null,
            },
          });
        }

        for (const postId of touchedPostIds) {
          const analyzedForPost = await tx.commentAnalysis.count({
            where: { postId, status: AnalysisStatus.analyzed },
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
    } catch (error) {
      this.ai.logFailure(error);

      await this.prisma.$transaction(async (tx) => {
        for (const target of targets) {
          await tx.commentAnalysis.update({
            where: { id: target.id },
            data: {
              sentiment: null,
              emotion: null,
              confidence: null,
              status: AnalysisStatus.failed,
              analyzedAt: null,
              error: error instanceof Error ? error.message : 'AI request failed',
            },
          });
        }
      });

      this.logger.warn(
        `Sync completed with AI failures for ${targets.length} comments`,
      );

      return {
        analyzedCount: 0,
        failedCount: targets.length,
        errorSummary:
          error instanceof Error
            ? `AI request failed: ${error.message}`
            : 'AI request failed',
      };
    }
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

  private async retryRequest<T>(action: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }

    throw lastError;
  }

  private async graphGet<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.http.get<T>(`${this.graphBase}${path}`, {
        params,
        timeout: 12000,
      }),
    );

    return response.data;
  }

  private parseGraphDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private isRecentItem(value: Date, lastSyncAt: Date | null): boolean {
    if (!lastSyncAt) {
      return true;
    }

    return value.getTime() > lastSyncAt.getTime();
  }
}
