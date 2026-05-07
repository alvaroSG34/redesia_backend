import { of } from 'rxjs';

import { AiService, normalizeConfidence, normalizeEmotion } from './ai.service';

describe('AiService normalization helpers', () => {
  it('normalizes spanish and english emotion labels', () => {
    expect(normalizeEmotion('alegría')).toBe('Joy');
    expect(normalizeEmotion('Love')).toBe('Love');
    expect(normalizeEmotion('Sorpresa')).toBe('Surprise');
    expect(normalizeEmotion('Disgust')).toBe('Disgust');
    expect(normalizeEmotion('asco')).toBe('Disgust');
  });

  it('returns null for unsupported emotions', () => {
    expect(normalizeEmotion('')).toBeNull();
    expect(normalizeEmotion('desconocido')).toBeNull();
  });

  it('normalizes and clamps confidence', () => {
    expect(normalizeConfidence(0.8)).toBe(0.8);
    expect(normalizeConfidence('0.4')).toBe(0.4);
    expect(normalizeConfidence(2)).toBe(1);
    expect(normalizeConfidence(-1)).toBe(0);
    expect(normalizeConfidence('x')).toBeNull();
  });
});

describe('AiService multimodal recommendation', () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.OPENROUTER_MODEL;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    }

    if (originalModel === undefined) {
      delete process.env.OPENROUTER_MODEL;
    } else {
      process.env.OPENROUTER_MODEL = originalModel;
    }
  });

  it('genera recomendacion multimodal cuando OpenRouter responde', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'openrouter/free';

    const http = {
      post: jest.fn().mockReturnValue(
        of({
          data: {
            choices: [{ message: { content: 'Recomendacion IA final' } }],
          },
        }),
      ),
    };

    const service = new AiService(http as never);
    const result = await service.generateMultimodalRecommendation({
      imageUrl: 'https://example.com/image.jpg',
      postCaption: 'Caption de prueba',
      objective: 'Aumentar conversion',
      summary: { analyzed: 2, positive: 1, negative: 1, neutral: 0, totalComments: 2 },
      topEmotions: [{ emotion: 'Joy', count: 1, percentage: 50 }],
      emotionGroups: [
        {
          emotion: 'Joy',
          comments: [
            { text: 'Excelente', sentiment: 'Positivo', confidence: 0.9, likes: 2 },
          ],
        },
      ],
    });

    expect(result.recommendation).toBe('Recomendacion IA final');
    expect(result.inputsUsed).toEqual({
      image: true,
      caption: true,
      objective: true,
      comments: true,
    });
  });

  it('retorna null cuando no hay OPENROUTER_API_KEY', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const http = { get: jest.fn(), post: jest.fn() };
    const service = new AiService(http as never);
    const result = await service.generateMultimodalRecommendation({
      imageUrl: 'https://example.com/image.jpg',
      postCaption: 'Caption de prueba',
      objective: 'Aumentar conversion',
      summary: { analyzed: 0, positive: 0, negative: 0, neutral: 0, totalComments: 4 },
      topEmotions: [],
      emotionGroups: [],
    });

    expect(result.recommendation).toBeNull();
    expect(result.inputsUsed).toEqual({
      image: true,
      caption: true,
      objective: true,
      comments: false,
    });
  });
});
