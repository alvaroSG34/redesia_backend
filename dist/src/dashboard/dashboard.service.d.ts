import { type DashboardStatsResponse, type DashboardV2Range, type DashboardV2Response } from '../common/contracts';
import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboard(search?: string): Promise<DashboardStatsResponse>;
    getDashboardV2(search?: string, range?: DashboardV2Range): Promise<DashboardV2Response>;
}
