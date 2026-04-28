import type { PostDetailAnalysisStatus, PostDetailSentimentLabel } from '../common/contracts';
export declare const DETAIL_WINDOW_DAYS = 30;
export declare function percentage(part: number, total: number): number;
export declare function deltaPct(current: number, previous: number): number;
export declare function resolveAnalysisStatus(analyzedComments: number, commentsTotal: number): PostDetailAnalysisStatus;
export declare function resolveSentimentLabel(input: {
    positive: number;
    negative: number;
    neutral: number;
}): PostDetailSentimentLabel;
export declare function resolveComparisonWindows(now?: Date): {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
};
export declare function normalizeMediaType(raw: string | null | undefined): string;
export declare function formatWindowLabel(start: Date, end: Date): string;
