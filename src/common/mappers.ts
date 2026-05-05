import {
  AccountStatus,
  AnalysisStatus,
  ClientStatus,
  Comment,
  CommentAnalysis,
  Post,
  Sentiment,
  SocialAccount,
  type Client,
} from '@prisma/client';

import {
  type ClientContract,
  type CommentAnalysisContract,
  type PostContract,
  type SocialAccountContract,
} from './contracts';

const monthFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatPostDate(date: Date): string {
  const parts = monthFormatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${day} de ${month}, ${year}`;
}

export function formatRelativeDate(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function mapClientStatus(
  status: ClientStatus,
): ClientContract['status'] {
  if (status === ClientStatus.ACTIVO) return 'Activo';
  if (status === ClientStatus.PENDIENTE) return 'Pendiente';
  return 'Sin cuenta';
}

export function parseClientStatus(status?: string): ClientStatus | null {
  if (!status || status === 'Todos') return null;
  if (status === 'Activos') return ClientStatus.ACTIVO;
  if (status === 'Pendientes') return ClientStatus.PENDIENTE;
  if (status === 'Sin cuenta') return ClientStatus.SIN_CUENTA;
  return null;
}

export function mapAccountStatus(
  status: AccountStatus,
): SocialAccountContract['status'] {
  if (status === AccountStatus.CONECTADO) return 'Conectado';
  if (status === AccountStatus.DESCONECTADO) return 'Desconectado';
  return 'Pendiente';
}

export function mapSentiment(
  sentiment: Sentiment | null,
): CommentAnalysisContract['sentiment'] {
  if (sentiment === Sentiment.POSITIVO) return 'Positivo';
  if (sentiment === Sentiment.NEGATIVO) return 'Negativo';
  return 'Neutral';
}

export function mapClient(
  contract: Client,
  stats?: { postCount: number; commentCount: number },
): ClientContract {
  return {
    id: contract.id,
    name: contract.name,
    shortName: contract.shortName,
    industry: contract.industry,
    description: contract.description,
    status: mapClientStatus(contract.status),
    connected: contract.connected,
    avatarColor: contract.avatarColor,
    ...(stats ? stats : {}),
  };
}

export function mapAccount(account: SocialAccount): SocialAccountContract {
  return {
    id: account.id,
    clientId: account.clientId,
    platform: 'Instagram Business',
    handle: account.handle,
    igBusinessId: account.igBusinessId ?? '-',
    facebookPage: account.facebookPage ?? '-',
    scopes: account.scopes,
    status: mapAccountStatus(account.status),
    lastSync: account.lastSyncAt
      ? formatRelativeDate(account.lastSyncAt)
      : 'sin sincronizaci\u00f3n',
  };
}

export function mapPost(post: Post): PostContract {
  return {
    id: post.id,
    clientId: post.clientId,
    caption: post.caption,
    publishedAt: formatPostDate(post.publishedAt),
    imageUrl: post.imageUrl ?? undefined,
    imageHint: post.imageHint ?? '',
    likes: post.likes,
    commentsCount: post.commentsCount,
    analyzedComments: post.analyzedComments,
  };
}

export function mapAnalysis(
  comment: Comment,
  analysis: CommentAnalysis | null,
): CommentAnalysisContract {
  return {
    id: comment.id,
    postId: comment.postId,
    username: comment.username,
    text: comment.text,
    likes: comment.likes,
    createdAt: formatRelativeDate(comment.createdAt),
    sentiment: mapSentiment(analysis?.sentiment ?? null),
    emotion: analysis?.emotion ?? '-',
    confidence: analysis?.confidence ?? null,
    status: mapAnalysisStatus(analysis?.status ?? AnalysisStatus.pending),
    retryCount: analysis?.retryCount ?? 0,
    lastAttemptAt: analysis?.lastAttemptAt?.toISOString() ?? null,
    error: analysis?.error ?? null,
  };
}

export function sentimentFromEmotion(
  emotion: string | null | undefined,
): Sentiment {
  if (emotion === 'Joy' || emotion === 'Love') return Sentiment.POSITIVO;
  if (emotion === 'Surprise' || emotion === 'Neutral' || !emotion) {
    return Sentiment.NEUTRAL;
  }
  return Sentiment.NEGATIVO;
}

function mapAnalysisStatus(
  status: AnalysisStatus,
): CommentAnalysisContract['status'] {
  if (status === AnalysisStatus.analyzed) return 'analyzed';
  if (status === AnalysisStatus.failed) return 'failed';
  return 'pending';
}
