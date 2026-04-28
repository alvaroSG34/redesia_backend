import { PostsService } from './posts.service';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    getPosts(clientId: string): Promise<import("../common/contracts").PostContract[]>;
    getPostDetailV2(clientId: string, postId: string): Promise<import("../common/contracts").PostDetailV2Response>;
    getPost(clientId: string, postId: string): Promise<import("../common/contracts").PostContract>;
}
