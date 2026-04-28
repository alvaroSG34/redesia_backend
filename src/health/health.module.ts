import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [AiModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
