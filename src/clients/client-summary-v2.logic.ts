import {
  type ClientSummaryAlertRuleId,
  type ClientSummaryAlertSeverity,
} from '../common/contracts';

export interface ClientAlertInput {
  clientId: string;
  connectedAccounts: number;
  staleSyncHours: number | null;
  coveragePct: number;
  negativePct: number;
  pendingComments: number;
}

export interface ClientAlert {
  id: string;
  severity: ClientSummaryAlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  ruleId: ClientSummaryAlertRuleId;
}

export function percentage(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

export function deltaPct(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function resolveHealth(input: ClientAlertInput): 'good' | 'warning' | 'critical' {
  if (
    input.connectedAccounts === 0 ||
    input.negativePct >= 30 ||
    input.pendingComments >= 50 ||
    input.coveragePct < 50
  ) {
    return 'critical';
  }

  if (
    input.coveragePct < 70 ||
    input.staleSyncHours !== null && input.staleSyncHours > 48 ||
    input.negativePct >= 20 ||
    input.pendingComments >= 20
  ) {
    return 'warning';
  }

  return 'good';
}

export function buildClientAlerts(input: ClientAlertInput): ClientAlert[] {
  const alerts: Array<ClientAlert & { impactA: number; impactB: number }> = [];

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
      title: 'Sincronizaci\u00f3n retrasada',
      description: `\u00daltima sincronizaci\u00f3n hace ${Math.floor(input.staleSyncHours)} horas.`,
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
      title: 'Cobertura de an\u00e1lisis baja',
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
      description: `${input.pendingComments} comentarios pendientes de an\u00e1lisis.`,
      actionLabel: 'Ir a cuentas',
      actionHref: `/clients/${input.clientId}/accounts`,
      ruleId: 'PENDING_WORKLOAD',
      impactA: input.pendingComments,
      impactB: input.negativePct,
    });
  }

  const severityRank: Record<ClientSummaryAlertSeverity, number> = {
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
