import type { ClientAccountsSummaryV2Response } from '../common/contracts';
import { InstagramService } from '../instagram/instagram.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../integrations/meta/meta.service';
import { CreateOauthUrlDto } from './dto/create-oauth-url.dto';
export declare class AccountsService {
    private readonly prisma;
    private readonly metaService;
    private readonly instagramService;
    constructor(prisma: PrismaService, metaService: MetaService, instagramService: InstagramService);
    getAccounts(clientId: string): Promise<import("../common/contracts").SocialAccountContract[]>;
    getAccountsSummaryV2(clientId: string): Promise<ClientAccountsSummaryV2Response>;
    createInstagramOauthUrl(clientId: string, dto: CreateOauthUrlDto): Promise<{
        clientId: string;
        state: `${string}-${string}-${string}-${string}-${string}`;
        url: string;
        expiresAt: string;
    }>;
    syncAccount(clientId: string, accountId: string): Promise<{
        ok: boolean;
        clientId: string;
        accountId: string;
        syncedPosts: number;
        syncedComments: number;
        analyzedCount: number;
        failedCount: number;
    }>;
    disconnectAccount(clientId: string, accountId: string): Promise<{
        ok: boolean;
        clientId: string;
        accountId: string;
    }>;
    private ensureClient;
    private mapAccountStatus;
    private mapSyncRun;
}
