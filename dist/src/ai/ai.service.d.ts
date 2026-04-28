import { HttpService } from '@nestjs/axios';
export interface AiBatchResult {
    text: string;
    predictedEmotion: string | null;
    confidence: number | null;
    error?: string;
}
export declare class AiService {
    private readonly http;
    private readonly logger;
    private readonly baseUrl;
    private readonly configError;
    constructor(http: HttpService);
    health(): Promise<{
        status: string;
        model?: string;
        baseUrl: string;
        error?: string;
    }>;
    analyzeBatch(texts: string[]): Promise<AiBatchResult[]>;
    logFailure(error: unknown): void;
}
export declare function normalizeEmotion(input?: string | null): string | null;
export declare function normalizeConfidence(input: unknown): number | null;
