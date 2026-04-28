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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jsonwebtoken_1 = require("jsonwebtoken");
let JwtAuthGuard = class JwtAuthGuard {
    config;
    constructor(config) {
        this.config = config;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = this.getHeaderValue(request.headers?.authorization)?.trim();
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing bearer token');
        }
        const token = authHeader.slice('Bearer '.length).trim();
        if (!token) {
            throw new common_1.UnauthorizedException('Missing bearer token');
        }
        const secret = this.config.get('APP_JWT_SECRET') ?? 'dev-jwt-change-me';
        try {
            const payload = (0, jsonwebtoken_1.verify)(token, secret);
            if (!this.isAuthPayload(payload)) {
                throw new common_1.UnauthorizedException('Invalid token payload');
            }
            request.user = payload;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    getHeaderValue(value) {
        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    }
    isAuthPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        const candidate = payload;
        return (typeof candidate.sub === 'string' &&
            typeof candidate.email === 'string' &&
            typeof candidate.role === 'string');
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map