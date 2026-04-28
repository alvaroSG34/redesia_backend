import { CommentsService } from './comments.service';
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    getPostComments(postId: string): Promise<import("../common/contracts").CommentAnalysisContract[]>;
}
