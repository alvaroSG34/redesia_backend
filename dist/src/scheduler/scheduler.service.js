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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const instagram_service_1 = require("../instagram/instagram.service");
const prisma_service_1 = require("../prisma/prisma.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    prisma;
    instagram;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(prisma, instagram) {
        this.prisma = prisma;
        this.instagram = instagram;
    }
    async syncConnectedAccounts() {
        const now = new Date();
        const accounts = await this.prisma.socialAccount.findMany({
            where: {
                status: client_1.AccountStatus.CONECTADO,
                token: {
                    is: {
                        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                    },
                },
            },
            select: {
                id: true,
                clientId: true,
            },
        });
        for (const account of accounts) {
            try {
                await this.instagram.syncAccount(account.clientId, account.id, client_1.SyncTrigger.cron);
            }
            catch (error) {
                this.logger.error(`Scheduled sync failed for account '${account.id}'`, error instanceof Error ? error.stack : String(error));
            }
        }
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(process.env.SYNC_CRON ?? '*/30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "syncConnectedAccounts", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        instagram_service_1.InstagramService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map