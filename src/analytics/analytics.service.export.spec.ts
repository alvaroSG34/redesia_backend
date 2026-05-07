import { AnalysisStatus, Sentiment } from '@prisma/client';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService export report recommendation source', () => {
  const buildPrismaMock = () => {
    const post = {
      id: 'post-1',
      clientId: 'client-1',
      caption: 'Post de prueba',
      publishedAt: new Date('2026-05-01T00:00:00.000Z'),
      imageUrl: 'https://example.com/image.jpg',
      client: { id: 'client-1', name: 'Cliente Uno' },
    };

    const comments = [
      {
        id: 'c-1',
        postId: 'post-1',
        username: '@ana',
        text: 'Excelente servicio',
        likes: 3,
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        analysis: {
          sentiment: Sentiment.POSITIVO,
          emotion: 'Joy',
          status: AnalysisStatus.analyzed,
          confidence: 0.91,
        },
      },
      {
        id: 'c-2',
        postId: 'post-1',
        username: '@ben',
        text: 'No me gusto',
        likes: 1,
        createdAt: new Date('2026-05-05T11:00:00.000Z'),
        analysis: {
          sentiment: Sentiment.NEGATIVO,
          emotion: 'Anger',
          status: AnalysisStatus.analyzed,
          confidence: 0.82,
        },
      },
    ];

    return {
      post: { findUnique: jest.fn().mockResolvedValue(post) },
      comment: { findMany: jest.fn().mockResolvedValue(comments) },
    };
  };

  it('marca recommendationSource como multimodal_ai cuando la IA responde', async () => {
    const prisma = buildPrismaMock();
    const ai = {
      generateMultimodalRecommendation: jest.fn().mockResolvedValue({
        recommendation: 'Recomendacion detallada IA',
        inputsUsed: {
          image: true,
          caption: true,
          objective: true,
          comments: true,
        },
      }),
    };
    const metrics = { recomputePostMetric: jest.fn() };

    const service = new AnalyticsService(
      prisma as never,
      ai as never,
      metrics as never,
    );

    const report = await service.getCommentsExportReport(
      'post-1',
      'Aumentar conversion',
    );

    expect(report.recommendationSource).toBe('multimodal_ai');
    expect(report.recommendationInputsUsed.image).toBe(true);
    expect(report.recommendation).toBe('Recomendacion detallada IA');
  });

  it('marca recommendationSource como fallback cuando IA no responde', async () => {
    const prisma = buildPrismaMock();
    const ai = {
      generateMultimodalRecommendation: jest.fn().mockResolvedValue({
        recommendation: null,
        inputsUsed: {
          image: false,
          caption: true,
          objective: true,
          comments: true,
        },
      }),
    };
    const metrics = { recomputePostMetric: jest.fn() };

    const service = new AnalyticsService(
      prisma as never,
      ai as never,
      metrics as never,
    );

    const report = await service.getCommentsExportReport(
      'post-1',
      'Aumentar conversion',
    );

    expect(report.recommendationSource).toBe('fallback');
    expect(report.recommendationInputsUsed.image).toBe(false);
    expect(report.recommendation.length).toBeGreaterThan(0);
  });
});
