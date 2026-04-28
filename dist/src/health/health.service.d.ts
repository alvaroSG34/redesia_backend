import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class HealthService {
    private readonly prisma;
    private readonly ai;
    constructor(prisma: PrismaService, ai: AiService);
    getHealth(): Promise<{
        status: string;
        db: string;
        ai: {
            status: string;
            model?: string;
            baseUrl: string;
            error?: string;
        };
        timestamp: string;
    }>;
}
