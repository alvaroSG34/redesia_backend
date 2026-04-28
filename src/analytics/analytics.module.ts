import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MetricsModule } from '../metrics/metrics.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AiModule, MetricsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
