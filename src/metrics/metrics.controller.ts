import { Controller, Get, Param } from '@nestjs/common';

import { MetricsService } from './metrics.service';

@Controller('v1/clients/:clientId/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getClientMetrics(@Param('clientId') clientId: string) {
    return this.metricsService.getClientMetrics(clientId);
  }
}
