import { SyncRunStatus } from '@prisma/client';

import type { AccountsHealth } from '../common/contracts';

export function resolveAccountsHealth(input: {
  connectedAccounts: number;
  latestSyncAt: Date | null;
  latestRunStatus: SyncRunStatus | null;
  now?: Date;
}): AccountsHealth {
  if (input.connectedAccounts === 0) {
    return 'critical';
  }

  if (input.latestRunStatus === SyncRunStatus.failed) {
    return 'warning';
  }

  if (!input.latestSyncAt) {
    return 'warning';
  }

  const now = input.now ?? new Date();
  const staleHours = (now.getTime() - input.latestSyncAt.getTime()) / (1000 * 60 * 60);

  if (staleHours > 48) {
    return 'warning';
  }

  return 'good';
}

export function resolvePrimaryAccount<T extends { status: string }>(accounts: T[]): T | null {
  if (!accounts.length) {
    return null;
  }

  return accounts.find((item) => item.status === 'CONECTADO') ?? accounts[0] ?? null;
}

export function resolveAccountActions(input: {
  connectedAccounts: number;
  hasAnyAccount: boolean;
  hasConnectedPrimary: boolean;
}) {
  const canConnect = input.connectedAccounts === 0;
  const canReconnect = input.hasAnyAccount;
  const canSync = input.hasConnectedPrimary;
  const canDisconnect = input.hasConnectedPrimary;

  return {
    canConnect,
    canReconnect,
    canSync,
    canDisconnect,
  };
}
