import { describe, expect, it } from '@jest/globals';
import { SyncRunStatus } from '@prisma/client';

import {
  resolveAccountActions,
  resolveAccountsHealth,
  resolvePrimaryAccount,
} from './accounts-summary-v2.logic';

describe('accounts-summary-v2 logic', () => {
  it('resolves health with expected rules', () => {
    expect(
      resolveAccountsHealth({
        connectedAccounts: 0,
        latestSyncAt: null,
        latestRunStatus: null,
      }),
    ).toBe('critical');

    expect(
      resolveAccountsHealth({
        connectedAccounts: 1,
        latestSyncAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
        latestRunStatus: SyncRunStatus.success,
      }),
    ).toBe('warning');

    expect(
      resolveAccountsHealth({
        connectedAccounts: 1,
        latestSyncAt: new Date(),
        latestRunStatus: SyncRunStatus.failed,
      }),
    ).toBe('warning');

    expect(
      resolveAccountsHealth({
        connectedAccounts: 1,
        latestSyncAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        latestRunStatus: SyncRunStatus.success,
      }),
    ).toBe('good');
  });

  it('resolves primary account preferring connected', () => {
    const primary = resolvePrimaryAccount([
      { id: 'a1', status: 'PENDIENTE' },
      { id: 'a2', status: 'CONECTADO' },
    ]);

    expect(primary?.id).toBe('a2');
  });

  it('resolves account actions', () => {
    expect(
      resolveAccountActions({
        connectedAccounts: 0,
        hasAnyAccount: false,
        hasConnectedPrimary: false,
      }),
    ).toEqual({
      canConnect: true,
      canReconnect: false,
      canSync: false,
      canDisconnect: false,
    });

    expect(
      resolveAccountActions({
        connectedAccounts: 1,
        hasAnyAccount: true,
        hasConnectedPrimary: true,
      }),
    ).toEqual({
      canConnect: false,
      canReconnect: true,
      canSync: true,
      canDisconnect: true,
    });
  });
});
