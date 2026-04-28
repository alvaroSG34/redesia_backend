"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccountsHealth = resolveAccountsHealth;
exports.resolvePrimaryAccount = resolvePrimaryAccount;
exports.resolveAccountActions = resolveAccountActions;
const client_1 = require("@prisma/client");
function resolveAccountsHealth(input) {
    if (input.connectedAccounts === 0) {
        return 'critical';
    }
    if (input.latestRunStatus === client_1.SyncRunStatus.failed) {
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
function resolvePrimaryAccount(accounts) {
    if (!accounts.length) {
        return null;
    }
    return accounts.find((item) => item.status === 'CONECTADO') ?? accounts[0] ?? null;
}
function resolveAccountActions(input) {
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
//# sourceMappingURL=accounts-summary-v2.logic.js.map