import { PrismaService } from '../prisma/prisma.service';
export declare class CommentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPostComments(postId: string): Promise<import("../common/contracts").CommentAnalysisContract[]>;
}
