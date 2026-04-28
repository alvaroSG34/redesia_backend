import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountStatus, SyncTrigger } from '@prisma/client';

import { InstagramService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagram: InstagramService,
  ) {}

  @Cron(process.env.SYNC_CRON ?? '*/30 * * * *')
  async syncConnectedAccounts(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        status: AccountStatus.CONECTADO,
        token: {
          is: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    for (const account of accounts) {
      try {
        await this.instagram.syncAccount(
          account.clientId,
          account.id,
          SyncTrigger.cron,
        );
      } catch (error) {
        this.logger.error(
          `Scheduled sync failed for account '${account.id}'`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
