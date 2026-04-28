import { AnalysisStatus, Sentiment } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import type { PostDetailV2Response } from '../common/contracts';
import { formatPostDate, mapAccountStatus, mapPost } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import {
  deltaPct,
  formatWindowLabel,
  normalizeMediaType,
  percentage,
  resolveAnalysisStatus,
  resolveComparisonWindows,
  resolveSentimentLabel,
} from './post-detail-v2.logic';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPosts(clientId: string) {
    const posts = await this.prisma.post.findMany({
      where: { clientId },
      orderBy: { publishedAt: 'desc' },
    });

    return posts.map(mapPost);
  }

  async getPost(clientId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, clientId },
    });

    if (!post) {
      throw new NotFoundException(
        `Post '${postId}' not found for client '${clientId}'`,
      );
    }

    return mapPost(post);
  }

  async getPostDetailV2(
    clientId: string,
    postId: string,
  ): Promise<PostDetailV2Response> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, clientId },
      include: {
        client: true,
        account: true,
      },
    });

    if (!post) {
      throw new NotFoundException(
        `Post '${postId}' not found for client '${clientId}'`,
      );
    }

    const windows = resolveComparisonWindows();

    const [analysesCurrent, analysesPrevious, previousPosts] = await Promise.all([
      this.prisma.commentAnalysis.findMany({
        where: {
          postId,
          status: AnalysisStatus.analyzed,
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
          status: AnalysisStatus.analyzed,
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

    const positive = analysesCurrent.filter(
      (item) => item.sentiment === Sentiment.POSITIVO,
    ).length;
    const negative = analysesCurrent.filter(
      (item) => item.sentiment === Sentiment.NEGATIVO,
    ).length;
    const neutral = analysesCurrent.filter(
      (item) => item.sentiment === Sentiment.NEUTRAL,
    ).length;

    const analyzedCurrent = analysesCurrent.length;
    const positivePct = percentage(positive, analyzedCurrent);
    const negativePct = percentage(negative, analyzedCurrent);
    const neutralPct = percentage(neutral, analyzedCurrent);

    const negativePrevious = analysesPrevious.filter(
      (item) => item.sentiment === Sentiment.NEGATIVO,
    ).length;
    const negativePreviousPct = percentage(negativePrevious, analysesPrevious.length);

    const emotionCount = new Map<string, number>();
    analysesCurrent.forEach((item) => {
      if (!item.emotion) return;
      emotionCount.set(item.emotion, (emotionCount.get(item.emotion) ?? 0) + 1);
    });
    const topEmotion =
      [...emotionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const previousLikesBaseline =
      previousPosts.length > 0
        ? Math.round(
            previousPosts.reduce((acc, row) => acc + row.likes, 0) /
              previousPosts.length,
          )
        : 0;
    const previousCommentsBaseline =
      previousPosts.length > 0
        ? Math.round(
            previousPosts.reduce((acc, row) => acc + row.commentsCount, 0) /
              previousPosts.length,
          )
        : 0;

    return {
      postHeader: {
        postId: post.id,
        clientId: post.clientId,
        clientName: post.client.name,
        caption: post.caption,
        publishedAt: formatPostDate(post.publishedAt),
        mediaType: normalizeMediaType(post.imageHint),
        imageUrl: post.imageUrl ?? null,
        accountHandle: post.account?.handle ?? 'Cuenta no disponible',
        accountPlatform: post.account?.platform ?? 'Plataforma no disponible',
        accountStatus: post.account
          ? mapAccountStatus(post.account.status)
          : 'Cuenta no disponible',
      },
      performance: {
        likes: post.likes,
        commentsTotal,
        analyzedComments,
        pendingComments,
        analysisStatus: resolveAnalysisStatus(analyzedComments, commentsTotal),
      },
      sentiment: {
        label: resolveSentimentLabel({ positive, negative, neutral }),
        positivePct,
        negativePct,
        neutralPct,
        topEmotion,
      },
      comparison: {
        periodLabelCurrent: formatWindowLabel(
          windows.currentStart,
          windows.currentEnd,
        ),
        periodLabelPrevious: formatWindowLabel(
          windows.previousStart,
          windows.previousEnd,
        ),
        likesDeltaPct: deltaPct(post.likes, previousLikesBaseline),
        commentsDeltaPct: deltaPct(commentsTotal, previousCommentsBaseline),
        negativePctDelta: deltaPct(negativePct, negativePreviousPct),
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
}
