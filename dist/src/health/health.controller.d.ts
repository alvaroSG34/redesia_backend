import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
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
