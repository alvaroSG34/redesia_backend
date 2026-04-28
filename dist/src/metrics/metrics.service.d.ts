import { PrismaService } from '../prisma/prisma.service';
export declare class MetricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    recomputePostMetric(postId: string): Promise<void>;
}
