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
exports.CryptoService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
let CryptoService = class CryptoService {
    key;
    constructor() {
        const rawKey = process.env.APP_ENCRYPTION_KEY ?? 'dev-only-change-me';
        this.key = (0, node_crypto_1.createHash)('sha256').update(rawKey).digest();
    }
    encrypt(plainText) {
        const iv = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
    }
    decrypt(payload) {
        const [ivText, tagText, dataText] = payload.split('.');
        if (!ivText || !tagText || !dataText) {
            throw new Error('Encrypted payload format is invalid');
        }
        const iv = Buffer.from(ivText, 'base64');
        const tag = Buffer.from(tagText, 'base64');
        const encrypted = Buffer.from(dataText, 'base64');
        const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
};
exports.CryptoService = CryptoService;
exports.CryptoService = CryptoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CryptoService);
//# sourceMappingURL=crypto.service.js.map