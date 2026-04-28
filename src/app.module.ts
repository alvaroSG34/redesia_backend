import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AccountsModule } from './accounts/accounts.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { CommentsModule } from './comments/comments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InstagramModule } from './instagram/instagram.module';
import { MetaModule } from './integrations/meta/meta.module';
import { MetricsModule } from './metrics/metrics.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityModule,
    AuthModule,
    AiModule,
    HealthModule,
    ClientsModule,
    CommentsModule,
    AccountsModule,
    MetaModule,
    PostsModule,
    AnalyticsModule,
    DashboardModule,
    MetricsModule,
    InstagramModule,
    SchedulerModule,
  ],
})
export class AppModule {}
