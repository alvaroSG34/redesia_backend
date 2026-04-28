import { SyncRunStatus } from '@prisma/client';
import type { AccountsHealth } from '../common/contracts';
export declare function resolveAccountsHealth(input: {
    connectedAccounts: number;
    latestSyncAt: Date | null;
    latestRunStatus: SyncRunStatus | null;
    now?: Date;
}): AccountsHealth;
export declare function resolvePrimaryAccount<T extends {
    status: string;
}>(accounts: T[]): T | null;
export declare function resolveAccountActions(input: {
    connectedAccounts: number;
    hasAnyAccount: boolean;
    hasConnectedPrimary: boolean;
}): {
    canConnect: boolean;
    canReconnect: boolean;
    canSync: boolean;
    canDisconnect: boolean;
};
