import { describe, expect, it } from '@jest/globals';

import {
  deltaPct,
  formatWindowLabel,
  normalizeMediaType,
  percentage,
  resolveAnalysisStatus,
  resolveComparisonWindows,
  resolveSentimentLabel,
} from './post-detail-v2.logic';

describe('post-detail-v2 logic', () => {
  it('calcula porcentajes y deltas con bordes', () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(3, 10)).toBe(30);

    expect(deltaPct(0, 0)).toBe(0);
    expect(deltaPct(10, 0)).toBe(100);
    expect(deltaPct(8, 10)).toBe(-20);
  });

  it('resuelve analysisStatus', () => {
    expect(resolveAnalysisStatus(0, 20)).toBe('pending');
    expect(resolveAnalysisStatus(10, 20)).toBe('partial');
    expect(resolveAnalysisStatus(20, 20)).toBe('complete');
  });

  it('resuelve etiqueta de sentimiento con empate neutral', () => {
    expect(resolveSentimentLabel({ positive: 5, negative: 1, neutral: 1 })).toBe(
      'positive',
    );
    expect(resolveSentimentLabel({ positive: 1, negative: 6, neutral: 1 })).toBe(
      'negative',
    );
    expect(resolveSentimentLabel({ positive: 2, negative: 2, neutral: 1 })).toBe(
      'neutral',
    );
  });

  it('resuelve media type y ventanas', () => {
    expect(normalizeMediaType('IMAGE')).toBe('Imagen');
    expect(normalizeMediaType('VIDEO')).toBe('Video');
    expect(normalizeMediaType('')).toBe('Contenido');

    const now = new Date('2026-04-27T00:00:00.000Z');
    const windows = resolveComparisonWindows(now);
    expect(windows.currentEnd.toISOString()).toBe(now.toISOString());
    expect(windows.previousStart.getTime()).toBeLessThan(
      windows.currentStart.getTime(),
    );

    const label = formatWindowLabel(windows.currentStart, windows.currentEnd);
    expect(label.length).toBeGreaterThan(0);
  });
});

