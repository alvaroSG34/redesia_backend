import { Controller, Get, Query } from '@nestjs/common';

import { type DashboardV2Range } from '../common/contracts';
import { DashboardService } from './dashboard.service';

@Controller('v1')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard(@Query('search') search?: string) {
    return this.dashboardService.getDashboard(search ?? '');
  }

  @Get('dashboard-v2')
  getDashboardV2(
    @Query('search') search?: string,
    @Query('range') range?: DashboardV2Range,
  ) {
    const normalizedRange =
      range === '7d' || range === 'month' || range === '30d' ? range : '30d';

    return this.dashboardService.getDashboardV2(search ?? '', normalizedRange);
  }
}
