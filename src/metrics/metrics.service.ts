import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientMetrics(clientId: string) {
    const [posts, metrics] = await Promise.all([
      this.prisma.post.findMany({ where: { clientId } }),
      this.prisma.postMetric.findMany({ where: { clientId } }),
    ]);

    const totalPosts = posts.length;
    const totalComments = posts.reduce(
      (acc, post) => acc + post.commentsCount,
      0,
    );
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

  async recomputePostMetric(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return;
    }

    const analyses = await this.prisma.commentAnalysis.findMany({
      where: { postId },
    });

    const positive = analyses.filter(
      (row) => row.sentiment === 'POSITIVO',
    ).length;
    const negative = analyses.filter(
      (row) => row.sentiment === 'NEGATIVO',
    ).length;
    const neutral = analyses.filter(
      (row) => row.sentiment === 'NEUTRAL',
    ).length;

    const engagement = Number(
      (
        (post.likes + post.commentsCount) /
        Math.max(1, post.likes + post.commentsCount + 1000)
      ).toFixed(4),
    );

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
}
