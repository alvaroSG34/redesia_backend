import { type ClientRiskLevel, type DashboardV2Alert, type DashboardV2Action, type DashboardV2TrendPoint } from '../common/contracts';
export interface ClientHealthInput {
    clientId: string;
    name: string;
    pendingComments: number;
    negativeRatePct: number;
    staleSyncHours: number | null;
}
export interface SentimentEntry {
    createdAt: Date;
    sentiment: 'POSITIVO' | 'NEGATIVO' | 'NEUTRAL';
}
export interface RangeWindow {
    start: Date;
    end: Date;
}
export declare function getCoveragePercentage(total: number, analyzed: number): number;
export declare function resolveRiskLevel(input: ClientHealthInput): ClientRiskLevel;
export declare function getRiskScore(input: ClientHealthInput): number;
export declare function buildAlerts(clients: ClientHealthInput[], analysisCoveragePct: number): DashboardV2Alert[];
export declare function buildTodayActions(alerts: DashboardV2Alert[]): DashboardV2Action[];
export declare function buildSentimentTrend(entries: SentimentEntry[], window: RangeWindow): DashboardV2TrendPoint[];
