import { type ClientSummaryAlertRuleId, type ClientSummaryAlertSeverity } from '../common/contracts';
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
export declare function percentage(part: number, total: number): number;
export declare function deltaPct(current: number, previous: number): number;
export declare function resolveHealth(input: ClientAlertInput): 'good' | 'warning' | 'critical';
export declare function buildClientAlerts(input: ClientAlertInput): ClientAlert[];
