import { HttpService } from '@nestjs/axios';
import { SyncTrigger } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../security/crypto.service';
export declare class InstagramService {
    private readonly prisma;
    private readonly http;
    private readonly crypto;
    private readonly metrics;
    private readonly ai;
    private readonly logger;
    private readonly graphBase;
    constructor(prisma: PrismaService, http: HttpService, crypto: CryptoService, metrics: MetricsService, ai: AiService);
    syncAccount(clientId: string, accountId: string, trigger?: SyncTrigger): Promise<{
        ok: boolean;
        clientId: string;
        accountId: string;
        syncedPosts: number;
        syncedComments: number;
        analyzedCount: number;
        failedCount: number;
    }>;
    private analyzePendingCommentsForPosts;
    private resolveAnalysisError;
    private retryRequest;
    private graphGet;
    private parseGraphDate;
    private isRecentItem;
}
