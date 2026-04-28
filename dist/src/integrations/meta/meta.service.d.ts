import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../security/crypto.service';
export declare class MetaService {
    private readonly prisma;
    private readonly http;
    private readonly crypto;
    private readonly graphBase;
    private readonly appId;
    private readonly appSecret;
    private readonly redirectUri;
    constructor(prisma: PrismaService, http: HttpService, crypto: CryptoService);
    createOauthUrl(clientId: string, scopes?: string[]): Promise<{
        clientId: string;
        state: `${string}-${string}-${string}-${string}-${string}`;
        url: string;
        expiresAt: string;
    }>;
    handleCallback(state: string, code: string): Promise<{
        ok: boolean;
        clientId: string;
        accountId: string;
        connected: boolean;
    }>;
    private exchangeCodeForToken;
    private assertMetaConfig;
    private exchangeLongLivedToken;
    private fetchPrimaryInstagramPage;
}
