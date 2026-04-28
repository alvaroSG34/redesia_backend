import type { PostDetailV2Response } from '../common/contracts';
import { PrismaService } from '../prisma/prisma.service';
export declare class PostsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPosts(clientId: string): Promise<import("../common/contracts").PostContract[]>;
    getPost(clientId: string, postId: string): Promise<import("../common/contracts").PostContract>;
    getPostDetailV2(clientId: string, postId: string): Promise<PostDetailV2Response>;
}
