import { AnalysisStatus, ClientStatus } from '@prisma/client';

import {
  formatRelativeDate,
  mapClientStatus,
  parseClientStatus,
  sentimentFromEmotion,
} from './mappers';

describe('mappers', () => {
  it('maps and parses client statuses', () => {
    expect(mapClientStatus(ClientStatus.ACTIVO)).toBe('Activo');
    expect(parseClientStatus('Activos')).toBe(ClientStatus.ACTIVO);
    expect(parseClientStatus('Sin cuenta')).toBe(ClientStatus.SIN_CUENTA);
    expect(parseClientStatus('Todos')).toBeNull();
  });

  it('formats relative date with hours and days', () => {
    const now = new Date('2026-04-26T12:00:00.000Z');
    const twoHours = new Date('2026-04-26T10:00:00.000Z');
    const threeDays = new Date('2026-04-23T12:00:00.000Z');

    expect(formatRelativeDate(twoHours, now)).toBe('hace 2h');
    expect(formatRelativeDate(threeDays, now)).toBe('hace 3d');
  });

  it('contains the expected analysis status literals', () => {
    expect(AnalysisStatus.analyzed).toBe('analyzed');
    expect(AnalysisStatus.pending).toBe('pending');
    expect(AnalysisStatus.failed).toBe('failed');
  });

  it('maps missing emotion to neutral sentiment', () => {
    expect(sentimentFromEmotion(null)).toBe('NEUTRAL');
    expect(sentimentFromEmotion('Neutral')).toBe('NEUTRAL');
  });
});
