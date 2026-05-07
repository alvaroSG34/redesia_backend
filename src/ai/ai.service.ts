import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface AiBatchResult {
  text: string;
  predictedEmotion: string | null;
  confidence: number | null;
  error?: string;
}

export interface AiRecommendationInput {
  objective: string;
  analyzedCount: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  topEmotions: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
}

export interface AiMultimodalRecommendationInput {
  imageUrl: string | null;
  postCaption: string;
  objective: string;
  summary: {
    analyzed: number;
    positive: number;
    negative: number;
    neutral: number;
    totalComments: number;
  };
  topEmotions: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  emotionGroups: Array<{
    emotion: string;
    comments: Array<{
      text: string;
      sentiment: 'Positivo' | 'Negativo' | 'Neutral';
      confidence: number | null;
      likes: number;
    }>;
  }>;
}

export interface AiMultimodalRecommendationResult {
  recommendation: string | null;
  inputsUsed: {
    image: boolean;
    caption: boolean;
    objective: boolean;
    comments: boolean;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly configError: string | null;
  private hasLoggedMissingRecommendationEndpoint = false;
  private hasLoggedMissingOpenRouterConfig = false;

  constructor(private readonly http: HttpService) {
    const configured = process.env.IA_BASE_URL?.trim() || 'http://localhost:5000';
    const validation = validateBaseUrl(configured);
    this.baseUrl = validation.baseUrl;
    this.configError = validation.error;

    if (this.configError) {
      this.logger.error(this.configError);
    }
  }

  async health(): Promise<{
    status: string;
    model?: string;
    baseUrl: string;
    error?: string;
  }> {
    if (this.configError) {
      return {
        status: 'misconfigured',
        baseUrl: this.baseUrl,
        error: this.configError,
      };
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ status?: string; model?: string }>(
          `${this.baseUrl}/health`,
          { timeout: 3000 },
        ),
      );

      return {
        status: response.data.status?.trim() || 'up',
        model: response.data.model,
        baseUrl: this.baseUrl,
      };
    } catch (error) {
      return {
        status: 'down',
        baseUrl: this.baseUrl,
        error:
          error instanceof Error ? error.message : 'Failed contacting IA service',
      };
    }
  }

  async analyzeBatch(texts: string[]): Promise<AiBatchResult[]> {
    if (texts.length === 0) {
      return [];
    }
    if (this.configError) {
      throw new Error(this.configError);
    }

    const response = await firstValueFrom(
      this.http.post<{
        results: Array<{
          text: string;
          predicted_emotion?: string;
          top_emotions?: Array<{ label: string; probability: number }>;
        }>;
      }>(`${this.baseUrl}/batch`, { texts }, { timeout: 15000 }),
    );

    return response.data.results.map((row) => {
      const predictedEmotion = normalizeEmotion(
        row.predicted_emotion ?? row.top_emotions?.[0]?.label,
      );
      const confidence = normalizeConfidence(row.top_emotions?.[0]?.probability);

      return {
        text: row.text,
        predictedEmotion,
        confidence,
        ...(predictedEmotion
          ? {}
          : { error: 'Emotion not classifiable from IA response' }),
      };
    });
  }

  async generateRecommendation(input: AiRecommendationInput): Promise<string | null> {
    if (this.configError) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{
          recommendation?: string;
          text?: string;
          result?: string;
        }>(
          `${this.baseUrl}/recommendation`,
          {
            objective: input.objective,
            context: {
              analyzed_count: input.analyzedCount,
              sentiment_distribution: {
                positive_pct: input.positivePct,
                negative_pct: input.negativePct,
                neutral_pct: input.neutralPct,
              },
              top_emotions: input.topEmotions,
            },
            instruction:
              'Genera una recomendacion breve, accionable y en espanol para optimizar el objetivo del post segun el analisis de comentarios.',
          },
          { timeout: 12000 },
        ),
      );

      const candidate =
        response.data.recommendation ??
        response.data.text ??
        response.data.result ??
        null;

      return candidate?.trim() ? candidate.trim() : null;
    } catch (error) {
      const status = resolveHttpStatus(error);

      if (status === 404) {
        if (!this.hasLoggedMissingRecommendationEndpoint) {
          this.logger.warn(
            'Recommendation endpoint not available (404). Using fallback recommendation logic.',
          );
          this.hasLoggedMissingRecommendationEndpoint = true;
        }
        return null;
      }

      this.logger.warn(
        `Recommendation endpoint failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }

  async generateMultimodalRecommendation(
    input: AiMultimodalRecommendationInput,
  ): Promise<AiMultimodalRecommendationResult> {
    const inputsUsed = {
      image: !!input.imageUrl?.trim(),
      caption: input.postCaption.trim().length > 0,
      objective: input.objective.trim().length > 0,
      comments: input.summary.analyzed > 0,
    };

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const model = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';

    if (!apiKey) {
      if (!this.hasLoggedMissingOpenRouterConfig) {
        this.logger.warn(
          'OPENROUTER_API_KEY is missing. Using fallback recommendation logic.',
        );
        this.hasLoggedMissingOpenRouterConfig = true;
      }
      return { recommendation: null, inputsUsed };
    }

    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const contentParts: Array<Record<string, unknown>> = [];
    if (input.imageUrl?.trim()) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: input.imageUrl.trim() },
      });
    }
    contentParts.push({
      type: 'text',
      text: buildMultimodalPrompt(input),
    });

    try {
      const response = await firstValueFrom(
        this.http.post<{
          choices?: Array<{
            finish_reason?: string | null;
            message?: {
              content?:
                | string
                | Array<{ type?: string; text?: string }>;
            };
          }>;
        }>(
          endpoint,
          {
            model,
            messages: [
              {
                role: 'user',
                content: contentParts,
              },
            ],
            temperature: 0.3,
            max_tokens: 1200,
          },
          {
            timeout: 20000,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const recommendation = extractOpenRouterText(response.data);
      const finishReason =
        response.data.choices?.[0]?.finish_reason?.toLowerCase() ?? null;
      if (finishReason === 'length') {
        this.logger.warn(
          `OpenRouter response was truncated by token limit (model=${model}).`,
        );
      }
      return {
        recommendation: recommendation?.trim() ? recommendation.trim() : null,
        inputsUsed,
      };
    } catch (error) {
      const status = resolveHttpStatus(error);
      if (status === 404) {
        this.logger.warn(
          'OpenRouter endpoint/model not available (404). Using fallback recommendation logic.',
        );
      } else {
        const details = buildHttpErrorLog(error);
        this.logger.warn(
          `OpenRouter multimodal recommendation failed (model=${model}, status=${
            status ?? 'unknown'
          }): ${details}`,
        );
      }
      return { recommendation: null, inputsUsed };
    }
  }

  logFailure(error: unknown): void {
    this.logger.error('AI service failed', error as Error);
  }
}

function buildMultimodalPrompt(input: AiMultimodalRecommendationInput): string {
  const emotionLines =
    input.topEmotions.length > 0
      ? input.topEmotions
          .map(
            (row) =>
              `- ${row.emotion}: ${row.count} comentarios (${row.percentage}%)`,
          )
          .join('\n')
      : '- Sin emociones dominantes';

  const sampleComments = input.emotionGroups
    .slice(0, 3)
    .map((group) => {
      const comments = group.comments
        .slice(0, 2)
        .map(
          (comment) =>
            `  - [${comment.sentiment}] (${comment.likes} likes, conf ${
              comment.confidence == null
                ? 'N/A'
                : `${Math.round(comment.confidence * 100)}%`
            }): ${comment.text}`,
        )
        .join('\n');
      return `- Emocion ${group.emotion}\n${comments || '  - Sin comentarios de muestra'}`;
    })
    .join('\n');

  return [
    'Eres un analista senior de redes sociales.',
    'Genera una recomendacion final detallada en espanol, siguiendo ESTE ORDEN de analisis:',
    '1) imagen del post, 2) descripcion/caption, 3) objetivo del negocio, 4) comentarios.',
    '',
    `Objetivo del post: ${input.objective}`,
    `Descripcion/caption: ${input.postCaption || 'Sin descripcion'}`,
    '',
    'Resumen cuantitativo de comentarios:',
    `- Total comentarios: ${input.summary.totalComments}`,
    `- Analizados: ${input.summary.analyzed}`,
    `- Positivos: ${input.summary.positive}`,
    `- Negativos: ${input.summary.negative}`,
    `- Neutrales: ${input.summary.neutral}`,
    '',
    'Top emociones:',
    emotionLines,
    '',
    'Muestra de comentarios:',
    sampleComments || '- Sin comentarios de muestra',
    '',
    'Salida requerida (usa exactamente estos titulos y en este orden):',
    'LECTURA VISUAL DEL POST',
    'LECTURA DEL MENSAJE',
    'LECTURA DE LA AUDIENCIA',
    'RECOMENDACION PARA EL POST ACTUAL',
    'RECOMENDACION PARA FUTURAS PUBLICACIONES',
    'RIESGOS SI NO SE ACTUA',
    'Reglas de formato:',
    '- No uses markdown, no uses asteriscos, no uses simbolos de encabezado.',
    '- En cada seccion de recomendacion incluye 3 acciones numeradas (1., 2., 3.) con verbo accionable.',
    '- Mantener un tono ejecutivo y claro.',
  ].join('\n');
}

function extractOpenRouterText(data: {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}): string | null {
  const choices = data.choices ?? [];
  for (const choice of choices) {
    const content = choice.message?.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
    if (Array.isArray(content)) {
      const merged = content
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();
      if (merged) {
        return merged;
      }
      for (const part of content) {
        if (typeof part.text === 'string' && part.text.trim()) {
          return part.text.trim();
        }
      }
    }
  }
  return null;
}

function validateBaseUrl(configured: string): {
  baseUrl: string;
  error: string | null;
} {
  try {
    const parsed = new URL(configured);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        baseUrl: configured,
        error: `IA_BASE_URL must use http/https. Received '${configured}'`,
      };
    }

    if (!parsed.hostname) {
      return {
        baseUrl: configured,
        error: `IA_BASE_URL host is missing. Received '${configured}'`,
      };
    }

    const normalized = parsed.toString().replace(/\/+$/, '');
    return { baseUrl: normalized, error: null };
  } catch {
    return {
      baseUrl: configured,
      error: `IA_BASE_URL is invalid or not resolvable: '${configured}'`,
    };
  }
}

export function normalizeEmotion(input?: string | null): string | null {
  if (!input) return null;

  const normalized = normalizeKey(input);
  const map: Record<string, string> = {
    joy: 'Joy',
    alegria: 'Joy',
    happy: 'Joy',
    felicidad: 'Joy',
    love: 'Love',
    amor: 'Love',
    surprise: 'Surprise',
    sorpresa: 'Surprise',
    sadness: 'Sadness',
    triste: 'Sadness',
    tristeza: 'Sadness',
    anger: 'Anger',
    enojo: 'Anger',
    ira: 'Anger',
    rabia: 'Anger',
    fear: 'Fear',
    miedo: 'Fear',
    temor: 'Fear',
    disgust: 'Disgust',
    disgusto: 'Disgust',
    asco: 'Disgust',
    repugnancia: 'Disgust',
    neutral: 'Neutral',
    neutro: 'Neutral',
  };

  return map[normalized] ?? null;
}

export function normalizeConfidence(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return clamp(input, 0, 1);
  }

  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number.parseFloat(input.trim());
    if (Number.isFinite(parsed)) {
      return clamp(parsed, 0, 1);
    }
  }

  return null;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const maybeResponse = (error as { response?: { status?: unknown } }).response;
  if (!maybeResponse || typeof maybeResponse !== 'object') return null;
  const status = maybeResponse.status;
  return typeof status === 'number' ? status : null;
}

function buildHttpErrorLog(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'unknown error';
  }

  const err = error as {
    message?: unknown;
    code?: unknown;
    response?: {
      status?: unknown;
      statusText?: unknown;
      headers?: Record<string, unknown>;
      data?: unknown;
    };
  };

  const message = typeof err.message === 'string' ? err.message : 'unknown error';
  const code = typeof err.code === 'string' ? err.code : null;
  const statusText =
    typeof err.response?.statusText === 'string' ? err.response.statusText : null;

  const headers = err.response?.headers ?? {};
  const retryAfter = headerValue(headers, 'retry-after');
  const rateRemaining = headerValue(headers, 'x-ratelimit-remaining');
  const rateReset = headerValue(headers, 'x-ratelimit-reset');

  const providerMessage = extractProviderMessage(err.response?.data);

  const chunks = [
    `message="${message}"`,
    ...(code ? [`code=${code}`] : []),
    ...(statusText ? [`statusText="${statusText}"`] : []),
    ...(retryAfter ? [`retryAfter=${retryAfter}`] : []),
    ...(rateRemaining ? [`rateRemaining=${rateRemaining}`] : []),
    ...(rateReset ? [`rateReset=${rateReset}`] : []),
    ...(providerMessage ? [`providerMessage="${providerMessage}"`] : []),
  ];

  return chunks.join(', ');
}

function headerValue(
  headers: Record<string, unknown>,
  name: string,
): string | null {
  const direct = headers[name];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function extractProviderMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return data.slice(0, 280);
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === 'string') {
      return obj.error.slice(0, 280);
    }
    if (obj.error && typeof obj.error === 'object') {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === 'string') {
        return inner.message.slice(0, 280);
      }
    }
    if (typeof obj.message === 'string') {
      return obj.message.slice(0, 280);
    }
  }

  return null;
}
