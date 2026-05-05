"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoveragePercentage = getCoveragePercentage;
exports.resolveRiskLevel = resolveRiskLevel;
exports.getRiskScore = getRiskScore;
exports.buildAlerts = buildAlerts;
exports.buildTodayActions = buildTodayActions;
exports.buildSentimentTrend = buildSentimentTrend;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function getCoveragePercentage(total, analyzed) {
    if (total <= 0) {
        return 0;
    }
    return Math.round((analyzed / total) * 100);
}
function resolveRiskLevel(input) {
    const score = getRiskScore(input);
    if (score >= 5) {
        return 'high';
    }
    if (score >= 2) {
        return 'medium';
    }
    return 'low';
}
function getRiskScore(input) {
    let score = 0;
    if (input.negativeRatePct >= 30) {
        score += 3;
    }
    else if (input.negativeRatePct >= 20) {
        score += 2;
    }
    else if (input.negativeRatePct >= 10) {
        score += 1;
    }
    if (input.staleSyncHours !== null) {
        if (input.staleSyncHours > 48) {
            score += 3;
        }
        else if (input.staleSyncHours > 24) {
            score += 1;
        }
    }
    if (input.pendingComments >= 50) {
        score += 3;
    }
    else if (input.pendingComments >= 20) {
        score += 1;
    }
    return score;
}
function buildAlerts(clients, analysisCoveragePct) {
    const draft = [];
    for (const client of clients) {
        if (client.negativeRatePct >= 30) {
            draft.push({
                id: `negative-${client.clientId}`,
                severity: 'high',
                title: `Riesgo de sentimiento negativo en ${client.name}`,
                description: `${client.negativeRatePct}% de comentarios analizados son negativos.`,
                actionLabel: 'Ver comentarios',
                actionHref: `/clients/${client.clientId}/posts`,
                ruleId: 'HIGH_NEGATIVE_SPIKE',
                impactA: client.pendingComments,
                impactB: client.negativeRatePct,
            });
        }
        if (client.staleSyncHours !== null && client.staleSyncHours > 48) {
            draft.push({
                id: `sync-${client.clientId}`,
                severity: 'medium',
                title: `Sincronizacion vencida en ${client.name}`,
                description: `Sin sincronizar hace ${Math.floor(client.staleSyncHours)} horas.`,
                actionLabel: 'Sincronizar',
                actionHref: `/clients/${client.clientId}/accounts`,
                ruleId: 'STALE_SYNC',
                impactA: client.pendingComments,
                impactB: client.negativeRatePct,
            });
        }
        if (client.pendingComments >= 50) {
            draft.push({
                id: `pending-${client.clientId}`,
                severity: 'high',
                title: `Alta carga pendiente en ${client.name}`,
                description: `${client.pendingComments} comentarios pendientes de analisis.`,
                actionLabel: 'Ir a cuenta',
                actionHref: `/clients/${client.clientId}/accounts`,
                ruleId: 'PENDING_WORKLOAD',
                impactA: client.pendingComments,
                impactB: client.negativeRatePct,
            });
        }
    }
    if (analysisCoveragePct < 70) {
        draft.push({
            id: 'coverage-global',
            severity: 'medium',
            title: 'Cobertura de analisis baja',
            description: `Solo ${analysisCoveragePct}% de comentarios fueron analizados.`,
            actionLabel: 'Ver clientes',
            actionHref: '/clients',
            ruleId: 'LOW_ANALYSIS_COVERAGE',
            impactA: 0,
            impactB: analysisCoveragePct,
        });
    }
    const severityRank = {
        high: 0,
        medium: 1,
        low: 2,
    };
    draft.sort((a, b) => {
        const bySeverity = severityRank[a.severity] - severityRank[b.severity];
        if (bySeverity !== 0)
            return bySeverity;
        if (b.impactA !== a.impactA) {
            return b.impactA - a.impactA;
        }
        return b.impactB - a.impactB;
    });
    return draft.map(({ impactA: _impactA, impactB: _impactB, ...alert }) => alert);
}
function buildTodayActions(alerts) {
    if (!alerts.length) {
        return [
            {
                id: 'default-1',
                title: 'Revisar clientes activos',
                description: 'No hay alertas criticas. Revisa desempeno general.',
                href: '/clients',
                priority: 1,
            },
            {
                id: 'default-2',
                title: 'Actualizar dashboard',
                description: 'Verifica nuevos datos y sincronizaciones recientes.',
                href: '/dashboard',
                priority: 2,
            },
            {
                id: 'default-3',
                title: 'Planificar proximos analisis',
                description: 'Prioriza posts con mas comentarios de la semana.',
                href: '/clients',
                priority: 3,
            },
        ];
    }
    return alerts.slice(0, 3).map((alert, index) => ({
        id: `action-${alert.id}`,
        title: alert.title,
        description: alert.description,
        href: alert.actionHref,
        priority: (index + 1),
    }));
}
function buildSentimentTrend(entries, window) {
    const totalMs = Math.max(1, window.end.getTime() - window.start.getTime());
    const buckets = Math.max(1, Math.ceil(totalMs / WEEK_MS));
    const trend = Array.from({ length: buckets }, (_, idx) => ({
        period: `Sem ${idx + 1}`,
        positive: 0,
        neutral: 0,
        negative: 0,
    }));
    for (const entry of entries) {
        const diff = entry.createdAt.getTime() - window.start.getTime();
        if (diff < 0 || entry.createdAt > window.end) {
            continue;
        }
        const rawIndex = Math.floor(diff / WEEK_MS);
        const index = Math.max(0, Math.min(buckets - 1, rawIndex));
        const point = trend[index];
        if (entry.sentiment === 'POSITIVO') {
            point.positive += 1;
            continue;
        }
        if (entry.sentiment === 'NEGATIVO') {
            point.negative += 1;
            continue;
        }
        point.neutral += 1;
    }
    return trend;
}
//# sourceMappingURL=dashboard-v2.logic.js.map