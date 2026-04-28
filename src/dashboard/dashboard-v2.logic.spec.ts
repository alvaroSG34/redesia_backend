import { describe, expect, it } from '@jest/globals';

import {
  buildAlerts,
  buildSentimentTrend,
  getCoveragePercentage,
} from './dashboard-v2.logic';

describe('dashboard-v2 logic', () => {
  it('calcula cobertura en borde 69/70 y 70/70', () => {
    expect(getCoveragePercentage(70, 48)).toBe(69);
    expect(getCoveragePercentage(70, 49)).toBe(70);
  });

  it('dispara reglas con bordes esperados', () => {
    const alerts = buildAlerts(
      [
        {
          clientId: 'a',
          name: 'A',
          pendingComments: 50,
          negativeRatePct: 30,
          staleSyncHours: 48,
        },
        {
          clientId: 'b',
          name: 'B',
          pendingComments: 10,
          negativeRatePct: 29,
          staleSyncHours: 49,
        },
      ],
      69,
    );

    expect(alerts.some((item) => item.ruleId === 'HIGH_NEGATIVE_SPIKE')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'PENDING_WORKLOAD')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'STALE_SYNC')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'LOW_ANALYSIS_COVERAGE')).toBe(true);

    expect(
      alerts.some(
        (item) => item.ruleId === 'HIGH_NEGATIVE_SPIKE' && item.id.includes('b'),
      ),
    ).toBe(false);

    expect(
      alerts.some((item) => item.ruleId === 'STALE_SYNC' && item.id.includes('a')),
    ).toBe(false);
  });

  it('ordena alertas por severidad e impacto', () => {
    const alerts = buildAlerts(
      [
        {
          clientId: 'low-impact',
          name: 'Low Impact',
          pendingComments: 55,
          negativeRatePct: 30,
          staleSyncHours: 10,
        },
        {
          clientId: 'high-impact',
          name: 'High Impact',
          pendingComments: 90,
          negativeRatePct: 34,
          staleSyncHours: 10,
        },
      ],
      90,
    );

    expect(alerts[0]?.id).toContain('high-impact');
    expect(alerts.some((item) => item.id.includes('low-impact'))).toBe(true);
  });

  it('arma tendencia semanal coherente', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');

    const trend = buildSentimentTrend(
      [
        { createdAt: new Date('2026-01-02T12:00:00.000Z'), sentiment: 'POSITIVO' },
        { createdAt: new Date('2026-01-10T12:00:00.000Z'), sentiment: 'NEGATIVO' },
        { createdAt: new Date('2026-01-20T12:00:00.000Z'), sentiment: 'NEUTRAL' },
      ],
      { start, end },
    );

    const totals = trend.reduce(
      (acc, item) => {
        acc.pos += item.positive;
        acc.neg += item.negative;
        acc.neu += item.neutral;
        return acc;
      },
      { pos: 0, neg: 0, neu: 0 },
    );

    expect(totals.pos).toBe(1);
    expect(totals.neg).toBe(1);
    expect(totals.neu).toBe(1);
  });
});
