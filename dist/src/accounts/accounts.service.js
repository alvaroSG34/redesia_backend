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
exports.AccountsService = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const mappers_1 = require("../common/mappers");
const instagram_service_1 = require("../instagram/instagram.service");
const prisma_service_1 = require("../prisma/prisma.service");
const meta_service_1 = require("../integrations/meta/meta.service");
const accounts_summary_v2_logic_1 = require("./accounts-summary-v2.logic");
let AccountsService = class AccountsService {
    prisma;
    metaService;
    instagramService;
    constructor(prisma, metaService, instagramService) {
        this.prisma = prisma;
        this.metaService = metaService;
        this.instagramService = instagramService;
    }
    async getAccounts(clientId) {
        await this.ensureClient(clientId);
        const accounts = await this.prisma.socialAccount.findMany({
            where: { clientId },
            orderBy: { createdAt: 'asc' },
        });
        return accounts.map(mappers_1.mapAccount);
    }
    async getAccountsSummaryV2(clientId) {
        const client = await this.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
        const [accounts, syncHistory] = await Promise.all([
            this.prisma.socialAccount.findMany({
                where: { clientId },
                orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
            }),
            this.prisma.syncRun.findMany({
                where: { clientId },
                orderBy: { startedAt: 'desc' },
                take: 5,
            }),
        ]);
        const normalizedAccounts = accounts.map((account) => ({
            id: account.id,
            platform: 'Instagram Business',
            handle: account.handle,
            status: this.mapAccountStatus(account.status),
            lastSyncAt: account.lastSyncAt ? account.lastSyncAt.toISOString() : null,
            scopes: account.scopes,
        }));
        const primarySource = (0, accounts_summary_v2_logic_1.resolvePrimaryAccount)(accounts);
        const primaryAccount = primarySource
            ? {
                id: primarySource.id,
                platform: 'Instagram Business',
                handle: primarySource.handle,
                status: this.mapAccountStatus(primarySource.status),
                lastSyncAt: primarySource.lastSyncAt
                    ? primarySource.lastSyncAt.toISOString()
                    : null,
                scopes: primarySource.scopes,
            }
            : null;
        const connectedAccounts = accounts.filter((account) => account.status === client_1.AccountStatus.CONECTADO).length;
        const latestSyncAt = accounts
            .map((account) => account.lastSyncAt)
            .filter((item) => Boolean(item))
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
        const latestRun = syncHistory[0] ?? null;
        return {
            header: {
                clientId: client.id,
                clientName: client.name,
                connectedAccounts,
                totalAccounts: accounts.length,
                health: (0, accounts_summary_v2_logic_1.resolveAccountsHealth)({
                    connectedAccounts,
                    latestSyncAt,
                    latestRunStatus: latestRun?.status ?? null,
                }),
                lastSyncAt: latestSyncAt ? latestSyncAt.toISOString() : null,
            },
            primaryAccount,
            accounts: normalizedAccounts,
            actions: (0, accounts_summary_v2_logic_1.resolveAccountActions)({
                connectedAccounts,
                hasAnyAccount: accounts.length > 0,
                hasConnectedPrimary: primarySource?.status === client_1.AccountStatus.CONECTADO,
            }),
            syncHistory: syncHistory.map((run) => this.mapSyncRun(run)),
        };
    }
    async createInstagramOauthUrl(clientId, dto) {
        await this.ensureClient(clientId);
        return this.metaService.createOauthUrl(clientId, dto.scopes);
    }
    async syncAccount(clientId, accountId) {
        await this.ensureClient(clientId);
        return this.instagramService.syncAccount(clientId, accountId);
    }
    async disconnectAccount(clientId, accountId) {
        await this.ensureClient(clientId);
        const account = await this.prisma.socialAccount.findFirst({
            where: { id: accountId, clientId },
            select: { id: true },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Account '${accountId}' not found for client '${clientId}'`);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.oauthToken.deleteMany({ where: { accountId } });
            await tx.socialAccount.update({
                where: { id: accountId },
                data: {
                    status: client_1.AccountStatus.DESCONECTADO,
                    lastSyncAt: null,
                },
            });
            const connectedCount = await tx.socialAccount.count({
                where: {
                    clientId,
                    status: client_1.AccountStatus.CONECTADO,
                },
            });
            await tx.client.update({
                where: { id: clientId },
                data: { connected: connectedCount > 0 },
            });
        });
        return { ok: true, clientId, accountId };
    }
    async ensureClient(clientId) {
        const count = await this.prisma.client.count({ where: { id: clientId } });
        if (!count) {
            throw new common_1.NotFoundException(`Client '${clientId}' not found`);
        }
    }
    mapAccountStatus(status) {
        if (status === client_1.AccountStatus.CONECTADO)
            return 'Conectado';
        if (status === client_1.AccountStatus.DESCONECTADO)
            return 'Desconectado';
        return 'Pendiente';
    }
    mapSyncRun(run) {
        return {
            id: run.id,
            status: run.status,
            trigger: run.trigger,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
            postsSynced: run.postsSynced,
            commentsSynced: run.commentsSynced,
            analyzedCount: run.analyzedCount,
            error: run.error ?? null,
        };
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_service_1.MetaService,
        instagram_service_1.InstagramService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map