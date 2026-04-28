import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SecurityModule } from '../security/security.module';
import { InstagramService } from './instagram.service';

@Module({
  imports: [HttpModule, SecurityModule, MetricsModule, AiModule],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
