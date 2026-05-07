import {
  buildExecutiveSection,
  buildExportGroups,
  buildExportSummary,
  buildFallbackRecommendation,
  limitEmotionGroupComments,
  pickRecommendation,
} from './comments-export.logic';

describe('comments export logic', () => {
  const rows = [
    {
      commentId: 'c-1',
      username: '@ana',
      text: 'ok',
      likes: 2,
      createdAt: new Date('2026-05-06T10:00:00.000Z'),
      sentiment: 'Positivo' as const,
      emotion: 'Joy',
      confidence: 0.91,
    },
    {
      commentId: 'c-2',
      username: '@ben',
      text: 'meh',
      likes: 1,
      createdAt: new Date('2026-05-06T12:00:00.000Z'),
      sentiment: 'Negativo' as const,
      emotion: 'Anger',
      confidence: 0.7,
    },
    {
      commentId: 'c-3',
      username: '@cami',
      text: 'wow',
      likes: 3,
      createdAt: new Date('2026-05-06T11:00:00.000Z'),
      sentiment: 'Positivo' as const,
      emotion: 'Joy',
      confidence: null,
    },
    {
      commentId: 'c-4',
      username: '@diego',
      text: 'genial',
      likes: 4,
      createdAt: new Date('2026-05-06T13:00:00.000Z'),
      sentiment: 'Positivo' as const,
      emotion: 'Joy',
      confidence: 0.8,
    },
  ];

  it('agrupa por emocion y ordena grupos por volumen', () => {
    const groups = buildExportGroups(rows);
    expect(groups.map((group) => group.emotion)).toEqual(['Joy', 'Anger']);
    expect(groups[0]?.count).toBe(3);
  });

  it('ordena comentarios por confianza desc y fecha desc', () => {
    const groups = buildExportGroups(rows);
    const joyIds = groups[0]?.comments.map((item) => item.commentId);
    expect(joyIds).toEqual(['c-1', 'c-4', 'c-3']);
  });

  it('limita comentarios por emocion al top solicitado', () => {
    const groups = buildExportGroups(rows);
    const limited = limitEmotionGroupComments(groups, 2);
    expect(limited[0]?.comments.length).toBe(2);
    expect(limited[0]?.comments.map((item) => item.commentId)).toEqual([
      'c-1',
      'c-4',
    ]);
  });

  it('construye resumen para el reporte', () => {
    const groups = buildExportGroups(rows);
    const summary = buildExportSummary(9, rows, groups);

    expect(summary.totalComments).toBe(9);
    expect(summary.analyzed).toBe(4);
    expect(summary.positive).toBe(3);
    expect(summary.negative).toBe(1);
    expect(summary.neutral).toBe(0);
    expect(summary.emotionDistribution[0]).toEqual({
      emotion: 'Joy',
      count: 3,
      percentage: 75,
    });
  });

  it('usa recomendacion IA cuando existe', () => {
    const fallback = 'fallback';
    const resolved = pickRecommendation('  usar esta recomendacion  ', fallback);
    expect(resolved).toBe('usar esta recomendacion');
  });

  it('usa fallback cuando IA falla o retorna vacio', () => {
    const fallback = buildFallbackRecommendation(
      'Aumentar conversion',
      {
        totalComments: 5,
        analyzed: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        emotionDistribution: [],
      },
      null,
    );

    expect(pickRecommendation('', fallback)).toBe(fallback);
    expect(pickRecommendation(undefined, fallback)).toBe(fallback);
  });

  it('construye bloque ejecutivo con cobertura, highlights y acciones', () => {
    const groups = buildExportGroups(rows);
    const summary = buildExportSummary(10, rows, groups);

    const executive = buildExecutiveSection(
      'aumentar conversion',
      summary,
      'Joy',
      'Refuerza CTA en piezas clave.',
    );

    expect(executive.coveragePct).toBe(40);
    expect(executive.highlights.length).toBeGreaterThanOrEqual(3);
    expect(executive.nextSteps.length).toBeGreaterThanOrEqual(3);
    expect(executive.nextSteps.length).toBeLessThanOrEqual(5);
  });
});
