import { MetricsService } from './metrics.service';
export declare class MetricsController {
    private readonly metricsService;
    constructor(metricsService: MetricsService);
    getClientMetrics(clientId: string): Promise<{
        clientId: string;
        totals: {
            posts: number;
            comments: number;
            likes: number;
        };
        sentiment: {
            positive: number;
            neutral: number;
            negative: number;
            positivePct: number;
            neutralPct: number;
            negativePct: number;
        };
        postMetrics: {
            comments: number;
            id: string;
            updatedAt: Date;
            clientId: string;
            likes: number;
            postId: string;
            engagement: number;
            positive: number;
            negative: number;
            neutral: number;
        }[];
    }>;
}
