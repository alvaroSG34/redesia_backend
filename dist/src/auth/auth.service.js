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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const matches = await (0, bcryptjs_1.compare)(dto.password, user.passwordHash);
        if (!matches) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const secret = this.config.get('APP_JWT_SECRET') ?? 'dev-jwt-change-me';
        const expiresIn = (this.config.get('APP_JWT_EXPIRES_IN') ??
            '1d');
        const accessToken = (0, jsonwebtoken_1.sign)(payload, secret, { expiresIn });
        return {
            accessToken,
            user: this.toPublicUser(user),
        };
    }
    async me(user) {
        const account = await this.prisma.user.findUnique({
            where: { id: user.sub },
        });
        if (!account || !account.isActive) {
            throw new common_1.UnauthorizedException('User not available');
        }
        return this.toPublicUser(account, true);
    }
    toPublicUser(user, includeActive = false) {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            ...(includeActive ? { isActive: user.isActive } : {}),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map