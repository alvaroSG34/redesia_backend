import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getPostCommentsAnalysis(postId: string): Promise<{
        summary: import("../common/contracts").PostAnalysisSummary;
        comments: import("../common/contracts").CommentAnalysisContract[];
    }>;
    getCommentsWorkbenchV2(postId: string): Promise<import("../common/contracts").CommentsWorkbenchV2Response>;
    analyzePostComments(postId: string): Promise<{
        summary: import("../common/contracts").PostAnalysisSummary;
        comments: import("../common/contracts").CommentAnalysisContract[];
    }>;
    reanalyzeComment(postId: string, commentId: string): Promise<import("../common/contracts").CommentsWorkbenchV2Response>;
}
