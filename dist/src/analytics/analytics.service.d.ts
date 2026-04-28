import { AiService } from '../ai/ai.service';
import { type CommentsWorkbenchV2Response, type PostAnalysisSummary } from '../common/contracts';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly ai;
    private readonly metricsService;
    constructor(prisma: PrismaService, ai: AiService, metricsService: MetricsService);
    getPostCommentsAnalysis(postId: string): Promise<{
        summary: PostAnalysisSummary;
        comments: import("../common/contracts").CommentAnalysisContract[];
    }>;
    getCommentsWorkbenchV2(postId: string): Promise<CommentsWorkbenchV2Response>;
    analyzePostComments(postId: string): Promise<{
        summary: PostAnalysisSummary;
        comments: import("../common/contracts").CommentAnalysisContract[];
    }>;
    reanalyzeComment(postId: string, commentId: string): Promise<CommentsWorkbenchV2Response>;
    private analyzeRows;
    private getCommentsWithAnalysis;
    private resolveAnalysisError;
    private buildSummary;
}
