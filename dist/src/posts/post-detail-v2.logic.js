"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DETAIL_WINDOW_DAYS = void 0;
exports.percentage = percentage;
exports.deltaPct = deltaPct;
exports.resolveAnalysisStatus = resolveAnalysisStatus;
exports.resolveSentimentLabel = resolveSentimentLabel;
exports.resolveComparisonWindows = resolveComparisonWindows;
exports.normalizeMediaType = normalizeMediaType;
exports.formatWindowLabel = formatWindowLabel;
exports.DETAIL_WINDOW_DAYS = 30;
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
function resolveAnalysisStatus(analyzedComments, commentsTotal) {
    if (commentsTotal <= 0 || analyzedComments <= 0) {
        return 'pending';
    }
    if (analyzedComments >= commentsTotal) {
        return 'complete';
    }
    return 'partial';
}
function resolveSentimentLabel(input) {
    if (input.positive > input.negative && input.positive > input.neutral) {
        return 'positive';
    }
    if (input.negative > input.positive && input.negative > input.neutral) {
        return 'negative';
    }
    return 'neutral';
}
function resolveComparisonWindows(now = new Date()) {
    const currentEnd = now;
    const currentStart = new Date(now.getTime() - exports.DETAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(currentStart.getTime() - exports.DETAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return { currentStart, currentEnd, previousStart, previousEnd };
}
function normalizeMediaType(raw) {
    const normalized = (raw ?? '').trim().toUpperCase();
    if (normalized === 'IMAGE')
        return 'Imagen';
    if (normalized === 'VIDEO')
        return 'Video';
    if (normalized === 'CAROUSEL_ALBUM')
        return 'Carrusel';
    return normalized ? raw?.trim() ?? 'Contenido' : 'Contenido';
}
function formatWindowLabel(start, end) {
    const fmt = new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'short',
    });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
}
//# sourceMappingURL=post-detail-v2.logic.js.map