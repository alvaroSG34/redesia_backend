import {
  AccountStatus,
  type SyncRun,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import type {
  AccountSummaryV2,
  ClientAccountsSummaryV2Response,
} from '../common/contracts';
import { mapAccount } from '../common/mappers';
import { InstagramService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../integrations/meta/meta.service';
import { CreateOauthUrlDto } from './dto/create-oauth-url.dto';
import {
  resolveAccountActions,
  resolveAccountsHealth,
  resolvePrimaryAccount,
} from './accounts-summary-v2.logic';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metaService: MetaService,
    private readonly instagramService: InstagramService,
  ) {}

  async getAccounts(clientId: string) {
    await this.ensureClient(clientId);

    const accounts = await this.prisma.socialAccount.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map(mapAccount);
  }

  async getAccountsSummaryV2(
    clientId: string,
  ): Promise<ClientAccountsSummaryV2Response> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found`);
    }

    const [accounts, syncHistory] = await Promise.all([
      this.prisma.socialAccount.findMany({
        where: { clientId },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.syncRun.findMany({
        where: { clientId },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    const normalizedAccounts: AccountSummaryV2[] = accounts.map((account) => ({
      id: account.id,
      platform: 'Instagram Business',
      handle: account.handle,
      status: this.mapAccountStatus(account.status),
      lastSyncAt: account.lastSyncAt ? account.lastSyncAt.toISOString() : null,
      scopes: account.scopes,
    }));

    const primarySource = resolvePrimaryAccount(accounts);
    const primaryAccount = primarySource
      ? {
          id: primarySource.id,
          platform: 'Instagram Business' as const,
          handle: primarySource.handle,
          status: this.mapAccountStatus(primarySource.status),
          lastSyncAt: primarySource.lastSyncAt
            ? primarySource.lastSyncAt.toISOString()
            : null,
          scopes: primarySource.scopes,
        }
      : null;

    const connectedAccounts = accounts.filter(
      (account) => account.status === AccountStatus.CONECTADO,
    ).length;

    const latestSyncAt = accounts
      .map((account) => account.lastSyncAt)
      .filter((item): item is Date => Boolean(item))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const latestRun = syncHistory[0] ?? null;

    return {
      header: {
        clientId: client.id,
        clientName: client.name,
        connectedAccounts,
        totalAccounts: accounts.length,
        health: resolveAccountsHealth({
          connectedAccounts,
          latestSyncAt,
          latestRunStatus: latestRun?.status ?? null,
        }),
        lastSyncAt: latestSyncAt ? latestSyncAt.toISOString() : null,
      },
      primaryAccount,
      accounts: normalizedAccounts,
      actions: resolveAccountActions({
        connectedAccounts,
        hasAnyAccount: accounts.length > 0,
        hasConnectedPrimary: primarySource?.status === AccountStatus.CONECTADO,
      }),
      syncHistory: syncHistory.map((run) => this.mapSyncRun(run)),
    };
  }

  async createInstagramOauthUrl(clientId: string, dto: CreateOauthUrlDto) {
    await this.ensureClient(clientId);
    return this.metaService.createOauthUrl(clientId, dto.scopes);
  }

  async syncAccount(clientId: string, accountId: string) {
    await this.ensureClient(clientId);
    return this.instagramService.syncAccount(clientId, accountId);
  }

  async disconnectAccount(clientId: string, accountId: string) {
    await this.ensureClient(clientId);

    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, clientId },
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException(
        `Account '${accountId}' not found for client '${clientId}'`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.oauthToken.deleteMany({ where: { accountId } });

      await tx.socialAccount.update({
        where: { id: accountId },
        data: {
          status: AccountStatus.DESCONECTADO,
          lastSyncAt: null,
        },
      });

      const connectedCount = await tx.socialAccount.count({
        where: {
          clientId,
          status: AccountStatus.CONECTADO,
        },
      });

      await tx.client.update({
        where: { id: clientId },
        data: { connected: connectedCount > 0 },
      });
    });

    return { ok: true, clientId, accountId };
  }

  private async ensureClient(clientId: string): Promise<void> {
    const count = await this.prisma.client.count({ where: { id: clientId } });
    if (!count) {
      throw new NotFoundException(`Client '${clientId}' not found`);
    }
  }

  private mapAccountStatus(status: AccountStatus): 'Conectado' | 'Pendiente' | 'Desconectado' {
    if (status === AccountStatus.CONECTADO) return 'Conectado';
    if (status === AccountStatus.DESCONECTADO) return 'Desconectado';
    return 'Pendiente';
  }

  private mapSyncRun(run: SyncRun) {
    return {
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
      postsSynced: run.postsSynced,
      commentsSynced: run.commentsSynced,
      analyzedCount: run.analyzedCount,
      error: run.error ?? null,
    };
  }
}
