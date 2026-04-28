import { AccountStatus, ClientStatus, Comment, CommentAnalysis, Post, Sentiment, SocialAccount, type Client } from '@prisma/client';
import { type ClientContract, type CommentAnalysisContract, type PostContract, type SocialAccountContract } from './contracts';
export declare function formatPostDate(date: Date): string;
export declare function formatRelativeDate(date: Date, now?: Date): string;
export declare function mapClientStatus(status: ClientStatus): ClientContract['status'];
export declare function parseClientStatus(status?: string): ClientStatus | null;
export declare function mapAccountStatus(status: AccountStatus): SocialAccountContract['status'];
export declare function mapSentiment(sentiment: Sentiment | null): CommentAnalysisContract['sentiment'];
export declare function mapClient(contract: Client, stats?: {
    postCount: number;
    commentCount: number;
}): ClientContract;
export declare function mapAccount(account: SocialAccount): SocialAccountContract;
export declare function mapPost(post: Post): PostContract;
export declare function mapAnalysis(comment: Comment, analysis: CommentAnalysis | null): CommentAnalysisContract;
export declare function sentimentFromEmotion(emotion: string | null | undefined): Sentiment;
