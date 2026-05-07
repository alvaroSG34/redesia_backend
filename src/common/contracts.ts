export type ClientStatusLabel = 'Activo' | 'Pendiente' | 'Sin cuenta';
export type AccountStatusLabel = 'Conectado' | 'Pendiente' | 'Desconectado';
export type AnalysisStatusLabel = 'pending' | 'analyzed' | 'failed';
export type SentimentLabel = 'Positivo' | 'Negativo' | 'Neutral';

export interface ClientContract {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  description: string;
  status: ClientStatusLabel;
  connected: boolean;
  avatarColor: string;
  postCount?: number;
  commentCount?: number;
}

export interface SocialAccountContract {
  id: string;
  clientId: string;
  platform: 'Instagram Business';
  handle: string;
  igBusinessId: string;
  facebookPage: string;
  scopes: string[];
  status: AccountStatusLabel;
  lastSync: string;
}

export interface PostContract {
  id: string;
  clientId: string;
  caption: string;
  publishedAt: string;
  imageUrl?: string;
  imageHint: string;
  likes: number;
  commentsCount: number;
  analyzedComments: number;
}

export interface CommentAnalysisContract {
  id: string;
  postId: string;
  username: string;
  text: string;
  likes: number;
  createdAt: string;
  sentiment: SentimentLabel;
  emotion: string;
  confidence: number | null;
  status: AnalysisStatusLabel;
  retryCount?: number;
  lastAttemptAt?: string | null;
  error?: string | null;
}

export interface CommentsWorkbenchItem {
  commentId: string;
  username: string;
  text: string;
  likes: number;
  createdAt: string;
  sentiment: SentimentLabel;
  emotion: string;
  confidence: number | null;
  analysisStatus: AnalysisStatusLabel;
  retryCount: number;
  lastAttemptAt: string | null;
  error: string | null;
}

export interface CommentsWorkbenchV2Response {
  header: {
    postId: string;
    clientId: string;
    clientName: string;
    postCaption: string;
    publishedAt: string;
    totalComments: number;
  };
  summary: {
    total: number;
    pending: number;
    analyzed: number;
    failed: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  filtersMeta: {
    emotions: string[];
    sentiments: SentimentLabel[];
    statuses: AnalysisStatusLabel[];
  };
  items: CommentsWorkbenchItem[];
  actions: {
    canAnalyzePending: boolean;
    canRefresh: boolean;
    canReanalyzeRow: boolean;
  };
}

export interface CommentsExportReportResponse {
  header: {
    postId: string;
    clientId: string;
    clientName: string;
    postCaption: string;
    publishedAt: string;
    imageUrl?: string | null;
  };
  objective: string;
  summary: {
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
  };
  emotionGroups: Array<{
    emotion: string;
    count: number;
    comments: Array<{
      commentId: string;
      username: string;
      text: string;
      likes: number;
      createdAt: string;
      sentiment: SentimentLabel;
      confidence: number | null;
    }>;
  }>;
  executive: {
    coveragePct: number;
    highlights: string[];
    nextSteps: Array<{
      priority: 'Alta' | 'Media' | 'Baja';
      action: string;
      rationale: string;
    }>;
  };
  recommendationSource: 'multimodal_ai' | 'fallback';
  recommendationInputsUsed: {
    image: boolean;
    caption: boolean;
    objective: boolean;
    comments: boolean;
  };
  recommendation: string;
  generatedAt: string;
}

export interface DashboardKpiContract {
  id: string;
  label: string;
  value: string;
  delta: string;
  context: string;
}

export interface DashboardStatsResponse {
  kpis: DashboardKpiContract[];
  recentClients: ClientContract[];
  trendingEmotions: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
}

export type DashboardV2Range = '30d' | '7d' | 'month';
export type AlertSeverity = 'high' | 'medium' | 'low';
export type ClientRiskLevel = 'high' | 'medium' | 'low';

export interface DashboardV2Overview {
  clientsTotal: number;
  connectedAccounts: number;
  postsTotal: number;
  commentsTotal: number;
  analyzedTotal: number;
  analysisCoveragePct: number;
}

export interface DashboardV2Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  ruleId:
    | 'HIGH_NEGATIVE_SPIKE'
    | 'STALE_SYNC'
    | 'LOW_ANALYSIS_COVERAGE'
    | 'PENDING_WORKLOAD';
}

export interface DashboardV2Action {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: 1 | 2 | 3;
}

export interface DashboardV2TrendPoint {
  period: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface DashboardV2ClientHealth {
  clientId: string;
  name: string;
  status: ClientStatusLabel;
  connected: boolean;
  lastSyncAt: string | null;
  pendingComments: number;
  negativeRatePct: number;
  riskLevel: ClientRiskLevel;
}

export interface DashboardV2Response {
  overview: DashboardV2Overview;
  alerts: DashboardV2Alert[];
  todayActions: DashboardV2Action[];
  sentimentTrend: DashboardV2TrendPoint[];
  emotionTop: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  clientsHealth: DashboardV2ClientHealth[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PostAnalysisSummary {
  postId: string;
  total: number;
  analyzed: number;
  positive: number;
  negative: number;
  neutral: number;
  topEmotion?: string;
}

export interface ClientDashboardSummary {
  client: ClientContract;
  kpis: DashboardKpiContract[];
  emotionDistribution: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  topPosts: PostContract[];
}

export type ClientSummaryAlertSeverity = 'high' | 'medium' | 'low';

export type ClientSummaryAlertRuleId =
  | 'NO_CONNECTED_ACCOUNT'
  | 'STALE_SYNC'
  | 'LOW_ANALYSIS_COVERAGE'
  | 'HIGH_NEGATIVE_RATE'
  | 'PENDING_WORKLOAD';

export interface ClientSummaryV2Response {
  clientHeader: Pick<
    ClientContract,
    'id' | 'name' | 'shortName' | 'industry' | 'connected' | 'status' | 'avatarColor'
  >;
  statusOverview: {
    health: 'good' | 'warning' | 'critical';
    coveragePct: number;
    negativePct: number;
    pendingComments: number;
    lastSyncAt: string | null;
    connectedAccounts: number;
  };
  alerts: Array<{
    id: string;
    severity: ClientSummaryAlertSeverity;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
    ruleId: ClientSummaryAlertRuleId;
  }>;
  kpis: Array<{
    id: string;
    label: string;
    value: string;
    deltaPct: number;
    context: string;
  }>;
  comparison: {
    periodLabelCurrent: string;
    periodLabelPrevious: string;
  };
  emotionTop: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  recentPosts: PostContract[];
}

export type AccountsHealth = 'good' | 'warning' | 'critical';
export type SyncRunStatusLabel = 'running' | 'success' | 'failed';
export type SyncTriggerLabel = 'manual' | 'cron';

export interface AccountSummaryV2 {
  id: string;
  platform: 'Instagram Business';
  handle: string;
  status: AccountStatusLabel;
  lastSyncAt: string | null;
  scopes: string[];
}

export interface ClientAccountsSummaryV2Response {
  header: {
    clientId: string;
    clientName: string;
    connectedAccounts: number;
    totalAccounts: number;
    health: AccountsHealth;
    lastSyncAt: string | null;
  };
  primaryAccount: AccountSummaryV2 | null;
  accounts: AccountSummaryV2[];
  actions: {
    canConnect: boolean;
    canReconnect: boolean;
    canSync: boolean;
    canDisconnect: boolean;
  };
  syncHistory: Array<{
    id: string;
    status: SyncRunStatusLabel;
    trigger: SyncTriggerLabel;
    startedAt: string;
    finishedAt: string | null;
    postsSynced: number;
    commentsSynced: number;
    analyzedCount: number;
    error: string | null;
  }>;
}

export type PostDetailAnalysisStatus = 'pending' | 'partial' | 'complete';
export type PostDetailSentimentLabel = 'positive' | 'negative' | 'neutral';
export type PostDetailActionIntent = 'primary' | 'secondary' | 'neutral';

export interface PostDetailV2Response {
  postHeader: {
    postId: string;
    clientId: string;
    clientName: string;
    caption: string;
    publishedAt: string;
    mediaType: string;
    imageUrl: string | null;
    accountHandle: string;
    accountPlatform: string;
    accountStatus: AccountStatusLabel | 'Cuenta no disponible';
  };
  performance: {
    likes: number;
    commentsTotal: number;
    analyzedComments: number;
    pendingComments: number;
    analysisStatus: PostDetailAnalysisStatus;
  };
  sentiment: {
    label: PostDetailSentimentLabel;
    positivePct: number;
    negativePct: number;
    neutralPct: number;
    topEmotion: string | null;
  };
  comparison: {
    periodLabelCurrent: string;
    periodLabelPrevious: string;
    likesDeltaPct: number;
    commentsDeltaPct: number;
    negativePctDelta: number;
  };
  actions: {
    primary: {
      label: string;
      href: string;
    };
    secondary: Array<{
      label: string;
      href: string;
      intent: PostDetailActionIntent;
    }>;
  };
}
