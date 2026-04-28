import { Module } from '@nestjs/common';

import { InstagramModule } from '../instagram/instagram.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [InstagramModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
