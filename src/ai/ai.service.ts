import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface AiBatchResult {
  text: string;
  predictedEmotion: string | null;
  confidence: number | null;
  error?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly configError: string | null;

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

  logFailure(error: unknown): void {
    this.logger.error('AI service failed', error as Error);
  }
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
