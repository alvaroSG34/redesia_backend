import { CreateOauthUrlDto } from './dto/create-oauth-url.dto';
import { AccountsService } from './accounts.service';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    getAccounts(clientId: string): Promise<import("../common/contracts").SocialAccountContract[]>;
    getAccountsSummaryV2(clientId: string): Promise<import("../common/contracts").ClientAccountsSummaryV2Response>;
    createOauthUrl(clientId: string, dto: CreateOauthUrlDto): Promise<{
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
}
