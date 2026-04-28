import { Injectable } from '@nestjs/common';

import { mapAnalysis } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPostComments(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((comment) => mapAnalysis(comment, comment.analysis));
  }
}
