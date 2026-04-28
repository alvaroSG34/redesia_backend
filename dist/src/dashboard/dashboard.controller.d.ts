import { type DashboardV2Range } from '../common/contracts';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboard(search?: string): Promise<import("../common/contracts").DashboardStatsResponse>;
    getDashboardV2(search?: string, range?: DashboardV2Range): Promise<import("../common/contracts").DashboardV2Response>;
}
