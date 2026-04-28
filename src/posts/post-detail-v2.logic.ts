import type {
  PostDetailAnalysisStatus,
  PostDetailSentimentLabel,
} from '../common/contracts';

export const DETAIL_WINDOW_DAYS = 30;

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

export function resolveAnalysisStatus(
  analyzedComments: number,
  commentsTotal: number,
): PostDetailAnalysisStatus {
  if (commentsTotal <= 0 || analyzedComments <= 0) {
    return 'pending';
  }

  if (analyzedComments >= commentsTotal) {
    return 'complete';
  }

  return 'partial';
}

export function resolveSentimentLabel(input: {
  positive: number;
  negative: number;
  neutral: number;
}): PostDetailSentimentLabel {
  if (input.positive > input.negative && input.positive > input.neutral) {
    return 'positive';
  }

  if (input.negative > input.positive && input.negative > input.neutral) {
    return 'negative';
  }

  return 'neutral';
}

export function resolveComparisonWindows(now = new Date()): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const currentEnd = now;
  const currentStart = new Date(
    now.getTime() - DETAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(
    currentStart.getTime() - DETAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  return { currentStart, currentEnd, previousStart, previousEnd };
}

export function normalizeMediaType(raw: string | null | undefined): string {
  const normalized = (raw ?? '').trim().toUpperCase();
  if (normalized === 'IMAGE') return 'Imagen';
  if (normalized === 'VIDEO') return 'Video';
  if (normalized === 'CAROUSEL_ALBUM') return 'Carrusel';
  return normalized ? raw?.trim() ?? 'Contenido' : 'Contenido';
}

export function formatWindowLabel(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
  });

  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

