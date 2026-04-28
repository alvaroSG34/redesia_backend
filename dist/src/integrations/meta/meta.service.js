"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_service_1 = require("../../security/crypto.service");
let MetaService = class MetaService {
    prisma;
    http;
    crypto;
    graphBase = 'https://graph.facebook.com/v22.0';
    appId = process.env.META_APP_ID ?? '';
    appSecret = process.env.META_APP_SECRET ?? '';
    redirectUri = process.env.META_REDIRECT_URI ?? '';
    constructor(prisma, http, crypto) {
        this.prisma = prisma;
        this.http = http;
        this.crypto = crypto;
    }
    async createOauthUrl(clientId, scopes) {
        this.assertMetaConfig();
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
        const nonce = (0, node_crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.oauthState.create({
            data: {
                nonce,
                clientId,
                expiresAt,
            },
        });
        const requestedScopes = scopes && scopes.length > 0
            ? scopes.join(',')
            : 'instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement';
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            state: nonce,
            scope: requestedScopes,
        });
        return {
            clientId,
            state: nonce,
            url: `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`,
            expiresAt: expiresAt.toISOString(),
        };
    }
    async handleCallback(state, code) {
        this.assertMetaConfig();
        const oauthState = await this.prisma.oauthState.findUnique({
            where: { nonce: state },
        });
        if (!oauthState) {
            throw new common_1.NotFoundException('OAuth state not found');
        }
        if (oauthState.usedAt) {
            throw new Error('OAuth state already used');
        }
        if (oauthState.expiresAt.getTime() < Date.now()) {
            throw new Error('OAuth state expired');
        }
        const shortToken = await this.exchangeCodeForToken(code);
        const longToken = await this.exchangeLongLivedToken(shortToken.access_token);
        const pageData = await this.fetchPrimaryInstagramPage(longToken.access_token).catch(() => null);
        const existing = await this.prisma.socialAccount.findFirst({
            where: { clientId: oauthState.clientId, platform: 'Instagram Business' },
            orderBy: { createdAt: 'asc' },
        });
        const account = existing
            ? await this.prisma.socialAccount.update({
                where: { id: existing.id },
                data: {
                    handle: pageData?.instagramHandle ?? existing.handle,
                    igBusinessId: pageData?.igBusinessId ?? existing.igBusinessId,
                    facebookPage: pageData?.pageName ?? existing.facebookPage,
                    scopes: pageData?.scopes ?? existing.scopes,
                    status: client_1.AccountStatus.CONECTADO,
                },
            })
            : await this.prisma.socialAccount.create({
                data: {
                    clientId: oauthState.clientId,
                    platform: 'Instagram Business',
                    handle: pageData?.instagramHandle ??
                        `@${oauthState.clientId.replace('-', '_')}`,
                    igBusinessId: pageData?.igBusinessId,
                    facebookPage: pageData?.pageName,
                    scopes: pageData?.scopes ?? [],
                    status: client_1.AccountStatus.CONECTADO,
                },
            });
        const expiresAt = longToken.expires_in
            ? new Date(Date.now() + longToken.expires_in * 1000)
            : undefined;
        await this.prisma.$transaction([
            this.prisma.oauthToken.upsert({
                where: { accountId: account.id },
                create: {
                    accountId: account.id,
                    encryptedAccessToken: this.crypto.encrypt(shortToken.access_token),
                    encryptedLongLivedToken: this.crypto.encrypt(longToken.access_token),
                    expiresAt,
                    scope: pageData?.scopes?.join(',') ?? undefined,
                },
                update: {
                    encryptedAccessToken: this.crypto.encrypt(shortToken.access_token),
                    encryptedLongLivedToken: this.crypto.encrypt(longToken.access_token),
                    expiresAt,
                    scope: pageData?.scopes?.join(',') ?? undefined,
                },
            }),
            this.prisma.oauthState.update({
                where: { nonce: state },
                data: { usedAt: new Date() },
            }),
            this.prisma.client.update({
                where: { id: oauthState.clientId },
                data: { connected: true, status: client_1.ClientStatus.ACTIVO },
            }),
        ]);
        return {
            ok: true,
            clientId: oauthState.clientId,
            accountId: account.id,
            connected: true,
        };
    }
    async exchangeCodeForToken(code) {
        const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.graphBase}/oauth/access_token`, {
            params: {
                client_id: this.appId,
                client_secret: this.appSecret,
                redirect_uri: this.redirectUri,
                code,
            },
            timeout: 12000,
        }));
        return response.data;
    }
    assertMetaConfig() {
        const hasPlaceholder = (value) => !value || value.trim() === '' || value.includes('replace_me');
        if (hasPlaceholder(this.appId) || hasPlaceholder(this.appSecret)) {
            throw new common_1.BadRequestException('Meta OAuth no configurado. Define META_APP_ID y META_APP_SECRET en backend/.env con credenciales reales.');
        }
        if (hasPlaceholder(this.redirectUri)) {
            throw new common_1.BadRequestException('Meta OAuth no configurado. Define META_REDIRECT_URI en backend/.env y configuralo tambien en Meta Developers.');
        }
    }
    async exchangeLongLivedToken(shortToken) {
        const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.graphBase}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                fb_exchange_token: shortToken,
            },
            timeout: 12000,
        }));
        return response.data;
    }
    async fetchPrimaryInstagramPage(accessToken) {
        const pagesResponse = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.graphBase}/me/accounts`, {
            params: { access_token: accessToken },
            timeout: 12000,
        }));
        const page = pagesResponse.data.data?.[0];
        if (!page) {
            return { scopes: [] };
        }
        const detailsResponse = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.graphBase}/${page.id}`, {
            params: {
                fields: 'id,name,instagram_business_account{id,username}',
                access_token: accessToken,
            },
            timeout: 12000,
        }));
        return {
            pageName: detailsResponse.data.name,
            igBusinessId: detailsResponse.data.instagram_business_account?.id,
            instagramHandle: detailsResponse.data.instagram_business_account?.username
                ? `@${detailsResponse.data.instagram_business_account.username}`
                : undefined,
            scopes: page.perms ?? page.tasks ?? [],
        };
    }
};
exports.MetaService = MetaService;
exports.MetaService = MetaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService,
        crypto_service_1.CryptoService])
], MetaService);
//# sourceMappingURL=meta.service.js.map