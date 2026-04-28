"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.percentage = percentage;
exports.deltaPct = deltaPct;
exports.resolveHealth = resolveHealth;
exports.buildClientAlerts = buildClientAlerts;
function percentage(part, total) {
    if (total <= 0) {
        return 0;
    }
    return Math.round((part / total) * 100);
}
function deltaPct(current, previous) {
    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
}
function resolveHealth(input) {
    if (input.connectedAccounts === 0 ||
        input.negativePct >= 30 ||
        input.pendingComments >= 50 ||
        input.coveragePct < 50) {
        return 'critical';
    }
    if (input.coveragePct < 70 ||
        input.staleSyncHours !== null && input.staleSyncHours > 48 ||
        input.negativePct >= 20 ||
        input.pendingComments >= 20) {
        return 'warning';
    }
    return 'good';
}
function buildClientAlerts(input) {
    const alerts = [];
    if (input.connectedAccounts === 0) {
        alerts.push({
            id: `no-account-${input.clientId}`,
            severity: 'high',
            title: 'Sin cuenta conectada',
            description: 'Conecta Instagram Business para sincronizar datos.',
            actionLabel: 'Ir a cuentas',
            actionHref: `/clients/${input.clientId}/accounts`,
            ruleId: 'NO_CONNECTED_ACCOUNT',
            impactA: input.pendingComments,
            impactB: input.negativePct,
        });
    }
    if (input.staleSyncHours !== null && input.staleSyncHours > 48) {
        alerts.push({
            id: `stale-sync-${input.clientId}`,
            severity: 'medium',
            title: 'Sincronizacion retrasada',
            description: `Ultima sincronizacion hace ${Math.floor(input.staleSyncHours)} horas.`,
            actionLabel: 'Sincronizar',
            actionHref: `/clients/${input.clientId}/accounts`,
            ruleId: 'STALE_SYNC',
            impactA: input.pendingComments,
            impactB: input.negativePct,
        });
    }
    if (input.coveragePct < 70) {
        alerts.push({
            id: `low-coverage-${input.clientId}`,
            severity: 'medium',
            title: 'Cobertura de analisis baja',
            description: `Solo ${input.coveragePct}% de comentarios analizados.`,
            actionLabel: 'Ver publicaciones',
            actionHref: `/clients/${input.clientId}/posts`,
            ruleId: 'LOW_ANALYSIS_COVERAGE',
            impactA: input.pendingComments,
            impactB: input.coveragePct,
        });
    }
    if (input.negativePct >= 30) {
        alerts.push({
            id: `high-negative-${input.clientId}`,
            severity: 'high',
            title: 'Sentimiento negativo alto',
            description: `${input.negativePct}% de comentarios analizados son negativos.`,
            actionLabel: 'Ver comentarios',
            actionHref: `/clients/${input.clientId}/posts`,
            ruleId: 'HIGH_NEGATIVE_RATE',
            impactA: input.pendingComments,
            impactB: input.negativePct,
        });
    }
    if (input.pendingComments >= 50) {
        alerts.push({
            id: `pending-workload-${input.clientId}`,
            severity: 'high',
            title: 'Carga pendiente alta',
            description: `${input.pendingComments} comentarios pendientes de analisis.`,
            actionLabel: 'Ir a cuentas',
            actionHref: `/clients/${input.clientId}/accounts`,
            ruleId: 'PENDING_WORKLOAD',
            impactA: input.pendingComments,
            impactB: input.negativePct,
        });
    }
    const severityRank = {
        high: 0,
        medium: 1,
        low: 2,
    };
    alerts.sort((a, b) => {
        const bySeverity = severityRank[a.severity] - severityRank[b.severity];
        if (bySeverity !== 0) {
            return bySeverity;
        }
        if (b.impactA !== a.impactA) {
            return b.impactA - a.impactA;
        }
        return b.impactB - a.impactB;
    });
    return alerts.map(({ impactA: _impactA, impactB: _impactB, ...alert }) => alert);
}
//# sourceMappingURL=client-summary-v2.logic.js.map