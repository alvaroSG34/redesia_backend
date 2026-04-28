import { describe, expect, it } from '@jest/globals';

import {
  buildClientAlerts,
  deltaPct,
  percentage,
  resolveHealth,
} from './client-summary-v2.logic';

describe('client-summary-v2 logic', () => {
  it('valida bordes de porcentaje y delta', () => {
    expect(percentage(69, 100)).toBe(69);
    expect(percentage(70, 100)).toBe(70);

    expect(deltaPct(100, 100)).toBe(0);
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(0, 0)).toBe(0);
  });

  it('dispara reglas en bordes esperados', () => {
    const alerts = buildClientAlerts({
      clientId: 'demo',
      connectedAccounts: 0,
      staleSyncHours: 49,
      coveragePct: 69,
      negativePct: 30,
      pendingComments: 50,
    });

    expect(alerts.some((item) => item.ruleId === 'NO_CONNECTED_ACCOUNT')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'STALE_SYNC')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'LOW_ANALYSIS_COVERAGE')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'HIGH_NEGATIVE_RATE')).toBe(true);
    expect(alerts.some((item) => item.ruleId === 'PENDING_WORKLOAD')).toBe(true);

    const nonAlerts = buildClientAlerts({
      clientId: 'demo',
      connectedAccounts: 1,
      staleSyncHours: 48,
      coveragePct: 70,
      negativePct: 29,
      pendingComments: 49,
    });

    expect(nonAlerts.length).toBe(0);
  });

  it('ordena alertas por severidad e impacto', () => {
    const alerts = buildClientAlerts({
      clientId: 'demo',
      connectedAccounts: 0,
      staleSyncHours: 96,
      coveragePct: 40,
      negativePct: 35,
      pendingComments: 120,
    });

    expect(alerts[0]?.severity).toBe('high');
    expect(alerts[alerts.length - 1]?.severity).toBe('medium');
  });

  it('resuelve health', () => {
    expect(
      resolveHealth({
        clientId: 'a',
        connectedAccounts: 0,
        staleSyncHours: null,
        coveragePct: 100,
        negativePct: 0,
        pendingComments: 0,
      }),
    ).toBe('critical');

    expect(
      resolveHealth({
        clientId: 'a',
        connectedAccounts: 1,
        staleSyncHours: 60,
        coveragePct: 80,
        negativePct: 10,
        pendingComments: 10,
      }),
    ).toBe('warning');

    expect(
      resolveHealth({
        clientId: 'a',
        connectedAccounts: 1,
        staleSyncHours: 5,
        coveragePct: 90,
        negativePct: 5,
        pendingComments: 4,
      }),
    ).toBe('good');
  });
});
