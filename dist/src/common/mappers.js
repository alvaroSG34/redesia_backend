"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPostDate = formatPostDate;
exports.formatRelativeDate = formatRelativeDate;
exports.mapClientStatus = mapClientStatus;
exports.parseClientStatus = parseClientStatus;
exports.mapAccountStatus = mapAccountStatus;
exports.mapSentiment = mapSentiment;
exports.mapClient = mapClient;
exports.mapAccount = mapAccount;
exports.mapPost = mapPost;
exports.mapAnalysis = mapAnalysis;
exports.sentimentFromEmotion = sentimentFromEmotion;
const client_1 = require("@prisma/client");
const monthFormatter = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
});
function formatPostDate(date) {
    const parts = monthFormatter.formatToParts(date);
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    return `${day} de ${month}, ${year}`;
}
function formatRelativeDate(date, now = new Date()) {
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
function mapClientStatus(status) {
    if (status === client_1.ClientStatus.ACTIVO)
        return 'Activo';
    if (status === client_1.ClientStatus.PENDIENTE)
        return 'Pendiente';
    return 'Sin cuenta';
}
function parseClientStatus(status) {
    if (!status || status === 'Todos')
        return null;
    if (status === 'Activos')
        return client_1.ClientStatus.ACTIVO;
    if (status === 'Pendientes')
        return client_1.ClientStatus.PENDIENTE;
    if (status === 'Sin cuenta')
        return client_1.ClientStatus.SIN_CUENTA;
    return null;
}
function mapAccountStatus(status) {
    if (status === client_1.AccountStatus.CONECTADO)
        return 'Conectado';
    if (status === client_1.AccountStatus.DESCONECTADO)
        return 'Desconectado';
    return 'Pendiente';
}
function mapSentiment(sentiment) {
    if (sentiment === client_1.Sentiment.POSITIVO)
        return 'Positivo';
    if (sentiment === client_1.Sentiment.NEGATIVO)
        return 'Negativo';
    return 'Neutral';
}
function mapClient(contract, stats) {
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
function mapAccount(account) {
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
            : 'sin sincronizacion',
    };
}
function mapPost(post) {
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
function mapAnalysis(comment, analysis) {
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
        status: mapAnalysisStatus(analysis?.status ?? client_1.AnalysisStatus.pending),
        retryCount: analysis?.retryCount ?? 0,
        lastAttemptAt: analysis?.lastAttemptAt?.toISOString() ?? null,
        error: analysis?.error ?? null,
    };
}
function sentimentFromEmotion(emotion) {
    if (emotion === 'Joy' || emotion === 'Love')
        return client_1.Sentiment.POSITIVO;
    if (emotion === 'Surprise' || emotion === 'Neutral' || !emotion) {
        return client_1.Sentiment.NEUTRAL;
    }
    return client_1.Sentiment.NEGATIVO;
}
function mapAnalysisStatus(status) {
    if (status === client_1.AnalysisStatus.analyzed)
        return 'analyzed';
    if (status === client_1.AnalysisStatus.failed)
        return 'failed';
    return 'pending';
}
//# sourceMappingURL=mappers.js.map