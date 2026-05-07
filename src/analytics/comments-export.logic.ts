import type { SentimentLabel } from '../common/contracts';

export interface ExportAnalyzedCommentInput {
  commentId: string;
  username: string;
  text: string;
  likes: number;
  createdAt: Date;
  sentiment: SentimentLabel;
  emotion: string;
  confidence: number | null;
}

export interface ExportEmotionGroup {
  emotion: string;
  count: number;
  comments: Array<{
    commentId: string;
    username: string;
    text: string;
    likes: number;
    createdAt: Date;
    sentiment: SentimentLabel;
    confidence: number | null;
  }>;
}

export interface ExportSummary {
  totalComments: number;
  analyzed: number;
  positive: number;
  negative: number;
  neutral: number;
  emotionDistribution: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
}

export type ExportStepPriority = 'Alta' | 'Media' | 'Baja';

export interface ExportNextStep {
  priority: ExportStepPriority;
  action: string;
  rationale: string;
}

export interface ExportExecutiveSection {
  coveragePct: number;
  highlights: string[];
  nextSteps: ExportNextStep[];
}

export function buildExportGroups(
  analyzedRows: ExportAnalyzedCommentInput[],
): ExportEmotionGroup[] {
  const grouped = new Map<string, ExportEmotionGroup['comments']>();

  for (const row of analyzedRows) {
    if (!grouped.has(row.emotion)) {
      grouped.set(row.emotion, []);
    }

    grouped.get(row.emotion)?.push({
      commentId: row.commentId,
      username: row.username,
      text: row.text,
      likes: row.likes,
      createdAt: row.createdAt,
      sentiment: row.sentiment,
      confidence: row.confidence,
    });
  }

  const groups = Array.from(grouped.entries()).map(([emotion, comments]) => ({
    emotion,
    count: comments.length,
    comments: [...comments].sort((a, b) => {
      const confidenceDelta = scoreConfidence(b.confidence) - scoreConfidence(a.confidence);
      if (confidenceDelta !== 0) {
        return confidenceDelta;
      }

      const createdAtDelta = b.createdAt.getTime() - a.createdAt.getTime();
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }

      return a.commentId.localeCompare(b.commentId);
    }),
  }));

  return groups.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.emotion.localeCompare(b.emotion);
  });
}

export function buildExportSummary(
  totalComments: number,
  analyzedRows: ExportAnalyzedCommentInput[],
  groups: ExportEmotionGroup[],
): ExportSummary {
  const analyzed = analyzedRows.length;
  const positive = analyzedRows.filter((row) => row.sentiment === 'Positivo').length;
  const negative = analyzedRows.filter((row) => row.sentiment === 'Negativo').length;
  const neutral = analyzedRows.filter((row) => row.sentiment === 'Neutral').length;

  const emotionDistribution = groups.map((group) => ({
    emotion: group.emotion,
    count: group.count,
    percentage: analyzed > 0 ? Math.round((group.count / analyzed) * 100) : 0,
  }));

  return {
    totalComments,
    analyzed,
    positive,
    negative,
    neutral,
    emotionDistribution,
  };
}

export function limitEmotionGroupComments(
  groups: ExportEmotionGroup[],
  topLimit: number,
): ExportEmotionGroup[] {
  return groups.map((group) => ({
    ...group,
    comments: group.comments.slice(0, topLimit),
  }));
}

export function buildFallbackRecommendation(
  objective: string,
  summary: ExportSummary,
  topEmotion: string | null,
): string {
  if (summary.analyzed === 0) {
    return [
      'LECTURA DE LA AUDIENCIA',
      `No hay comentarios analizados suficientes para evaluar el objetivo "${objective}" con confiabilidad.`,
      '',
      'RECOMENDACION PARA EL POST ACTUAL',
      '1. Completar el analisis de comentarios pendientes antes de ajustar el contenido.',
      '2. Publicar una actualizacion breve que solicite feedback concreto para obtener señales utiles.',
      '',
      'RECOMENDACION PARA FUTURAS PUBLICACIONES',
      '1. Definir una hipotesis de mensaje por publicacion (problema, promesa y llamado a la accion).',
      '2. Estandarizar una revision de sentimiento 24h y 72h despues de cada post.',
      '',
      'RIESGOS SI NO SE ACTUA',
      '- Las decisiones de contenido pueden basarse en una muestra incompleta.',
      '- Se retrasa el aprendizaje sobre que formato impulsa mejor el objetivo.',
    ].join('\n');
  }

  const positivePct = Math.round((summary.positive / summary.analyzed) * 100);
  const negativePct = Math.round((summary.negative / summary.analyzed) * 100);
  const neutralPct = Math.round((summary.neutral / summary.analyzed) * 100);

  let base = '';
  if (negativePct >= 35) {
    base =
      'La conversacion presenta friccion relevante. Recomiendo ajustar mensaje, resolver dudas frecuentes y responder objeciones con prioridad.';
  } else if (positivePct >= 55) {
    base =
      'La conversacion es mayormente favorable. Recomiendo escalar el formato actual y reforzar llamados a la accion orientados a conversion.';
  } else if (neutralPct >= 45) {
    base =
      'Predomina una respuesta neutral. Recomiendo hacer el contenido mas especifico y accionable para mover audiencia a interacciones positivas.';
  } else {
    base =
      'La conversacion es mixta. Recomiendo iterar mensaje y segmentar respuestas para aumentar positivos y reducir negativos.';
  }

  const emotionHint = topEmotion
    ? `Emocion dominante detectada: ${topEmotion}. Ajusta tono y creatividades para trabajar esa reaccion.`
    : 'No se detecto una emocion dominante clara; conviene testear dos variantes de mensaje.';

  return [
    'LECTURA DE LA AUDIENCIA',
    `Objetivo evaluado: "${objective}".`,
    `${base} ${emotionHint}`,
    `Distribucion actual: ${positivePct}% positivo, ${negativePct}% negativo, ${neutralPct}% neutral.`,
    '',
    'RECOMENDACION PARA EL POST ACTUAL',
    '1. Ajustar el copy del post para responder la emocion dominante y reducir friccion visible.',
    '2. Reforzar el llamado a la accion con un beneficio especifico y medible.',
    '3. Responder comentarios clave en menos de 24h para sostener percepcion de marca.',
    '',
    'RECOMENDACION PARA FUTURAS PUBLICACIONES',
    '1. Repetir el formato que genere mayor proporcion positiva y menor volumen negativo.',
    '2. Probar dos variantes de creativo/caption por objetivo y comparar resultados semanales.',
    '3. Incorporar preguntas directas para elevar comentarios de valor y detectar objeciones antes.',
    '',
    'RIESGOS SI NO SE ACTUA',
    '- Puede mantenerse una conversacion mixta o negativa con impacto en conversion.',
    '- Se pierde la oportunidad de capitalizar aprendizajes de emocion y sentimiento.',
  ].join('\n');
}

export function pickRecommendation(
  aiRecommendation: string | null | undefined,
  fallbackRecommendation: string,
): string {
  const normalizedFallback = normalizeRecommendationText(fallbackRecommendation);
  const normalized = normalizeRecommendationText(aiRecommendation ?? '');

  if (!normalized) {
    return normalizedFallback;
  }

  return normalized;
}

function normalizeRecommendationText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/[*`#]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}


export function buildExecutiveSection(
  objective: string,
  summary: ExportSummary,
  topEmotion: string | null,
  recommendation: string,
): ExportExecutiveSection {
  const coveragePct = calculateCoveragePct(summary.analyzed, summary.totalComments);
  const positivePct = calculateCoveragePct(summary.positive, summary.analyzed);
  const negativePct = calculateCoveragePct(summary.negative, summary.analyzed);
  const neutralPct = calculateCoveragePct(summary.neutral, summary.analyzed);

  const highlights = buildHighlights({
    coveragePct,
    positivePct,
    negativePct,
    neutralPct,
    analyzed: summary.analyzed,
    topEmotion,
  });

  const nextSteps = buildNextSteps({
    objective,
    coveragePct,
    positivePct,
    negativePct,
    neutralPct,
    topEmotion,
    recommendation,
  });

  return {
    coveragePct,
    highlights,
    nextSteps,
  };
}

function scoreConfidence(confidence: number | null): number {
  if (confidence == null) {
    return -1;
  }

  return confidence;
}

function calculateCoveragePct(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((current / total) * 100);
}

function buildHighlights(input: {
  coveragePct: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  analyzed: number;
  topEmotion: string | null;
}): string[] {
  const highlights: string[] = [];

  if (input.analyzed === 0) {
    return [
      'No hay comentarios analizados para extraer tendencias confiables.',
      'Prioriza completar el analisis para habilitar decisiones operativas.',
      'El reporte mantiene la recomendacion con fallback determinista.',
    ];
  }

  highlights.push(
    `Cobertura de analisis: ${input.coveragePct}% de comentarios totales.`,
  );

  if (input.negativePct >= 35) {
    highlights.push(
      `Se detecta friccion relevante: ${input.negativePct}% de comentarios negativos.`,
    );
  } else if (input.positivePct >= 55) {
    highlights.push(
      `Sentimiento favorable dominante: ${input.positivePct}% de comentarios positivos.`,
    );
  } else if (input.neutralPct >= 45) {
    highlights.push(
      `Predomina tono neutral (${input.neutralPct}%), con oportunidad de mejorar conversion.`,
    );
  } else {
    highlights.push('La conversacion es mixta y requiere ajuste fino de mensaje.');
  }

  highlights.push(
    input.topEmotion
      ? `Emocion dominante: ${input.topEmotion}.`
      : 'No hay emocion dominante claramente marcada.',
  );

  highlights.push(
    `Distribucion actual: ${input.positivePct}% positivo, ${input.negativePct}% negativo, ${input.neutralPct}% neutral.`,
  );

  return highlights.slice(0, 4);
}

function buildNextSteps(input: {
  objective: string;
  coveragePct: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  topEmotion: string | null;
  recommendation: string;
}): ExportNextStep[] {
  const steps: ExportNextStep[] = [];

  if (input.coveragePct < 70) {
    steps.push({
      priority: 'Alta',
      action: 'Completar analisis de pendientes',
      rationale:
        'Sin cobertura suficiente, las decisiones pueden estar sesgadas por muestra incompleta.',
    });
  }

  if (input.negativePct >= 35) {
    steps.push({
      priority: 'Alta',
      action: 'Responder objeciones criticas en menos de 24h',
      rationale:
        'La tasa de negatividad sugiere friccion activa que puede afectar percepcion y conversion.',
    });
  }

  if (input.neutralPct >= 45) {
    steps.push({
      priority: 'Media',
      action: 'Fortalecer CTA y propuesta de valor en el copy',
      rationale:
        'Un volumen alto de neutralidad indica interes tibio y oportunidad de empujar accion.',
    });
  }

  if (input.positivePct >= 55) {
    steps.push({
      priority: 'Media',
      action: 'Escalar formato de contenido con mejor respuesta',
      rationale:
        'El sentimiento positivo dominante valida creatividad y narrativa actuales.',
    });
  }

  if (input.topEmotion) {
    steps.push({
      priority: 'Media',
      action: `Ajustar tono creativo segun emocion dominante (${input.topEmotion})`,
      rationale:
        'Alinear mensaje con la emocion dominante mejora resonancia y continuidad conversacional.',
    });
  }

  steps.push({
    priority: 'Baja',
    action: `Medir impacto de acciones sobre el objetivo: ${input.objective}`,
    rationale:
      'Comparar evolutivo semanal permite validar si las mejoras aumentan resultado esperado.',
  });

  if (input.recommendation.trim()) {
    steps.push({
      priority: 'Baja',
      action: 'Aplicar recomendacion final del informe',
      rationale: 'Sintetiza el analisis emocional en una accion integrada de corto plazo.',
    });
  }

  return dedupeSteps(steps).slice(0, 5);
}

function dedupeSteps(steps: ExportNextStep[]): ExportNextStep[] {
  const seen = new Set<string>();
  const output: ExportNextStep[] = [];

  for (const step of steps) {
    const key = `${step.priority}:${step.action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(step);
  }

  if (output.length >= 3) return output;

  const fillers: ExportNextStep[] = [
    {
      priority: 'Media',
      action: 'Revisar variaciones de copy por segmento',
      rationale: 'Segmentar mensajes mejora relevancia percibida y calidad de respuesta.',
    },
    {
      priority: 'Baja',
      action: 'Monitorear evolucion de emociones por semana',
      rationale: 'La tendencia temporal valida si los ajustes sostienen mejoras.',
    },
  ];

  for (const filler of fillers) {
    if (output.length >= 3) break;
    output.push(filler);
  }

  return output;
}
