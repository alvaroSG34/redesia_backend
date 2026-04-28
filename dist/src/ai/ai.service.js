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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
exports.normalizeEmotion = normalizeEmotion;
exports.normalizeConfidence = normalizeConfidence;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let AiService = AiService_1 = class AiService {
    http;
    logger = new common_1.Logger(AiService_1.name);
    baseUrl;
    configError;
    constructor(http) {
        this.http = http;
        const configured = process.env.IA_BASE_URL?.trim() || 'http://localhost:5000';
        const validation = validateBaseUrl(configured);
        this.baseUrl = validation.baseUrl;
        this.configError = validation.error;
        if (this.configError) {
            this.logger.error(this.configError);
        }
    }
    async health() {
        if (this.configError) {
            return {
                status: 'misconfigured',
                baseUrl: this.baseUrl,
                error: this.configError,
            };
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`${this.baseUrl}/health`, { timeout: 3000 }));
            return {
                status: response.data.status?.trim() || 'up',
                model: response.data.model,
                baseUrl: this.baseUrl,
            };
        }
        catch (error) {
            return {
                status: 'down',
                baseUrl: this.baseUrl,
                error: error instanceof Error ? error.message : 'Failed contacting IA service',
            };
        }
    }
    async analyzeBatch(texts) {
        if (texts.length === 0) {
            return [];
        }
        if (this.configError) {
            throw new Error(this.configError);
        }
        const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${this.baseUrl}/batch`, { texts }, { timeout: 15000 }));
        return response.data.results.map((row) => {
            const predictedEmotion = normalizeEmotion(row.predicted_emotion ?? row.top_emotions?.[0]?.label);
            const confidence = normalizeConfidence(row.top_emotions?.[0]?.probability);
            return {
                text: row.text,
                predictedEmotion,
                confidence,
                ...(predictedEmotion
                    ? {}
                    : { error: 'Emotion not classifiable from IA response' }),
            };
        });
    }
    logFailure(error) {
        this.logger.error('AI service failed', error);
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AiService);
function validateBaseUrl(configured) {
    try {
        const parsed = new URL(configured);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return {
                baseUrl: configured,
                error: `IA_BASE_URL must use http/https. Received '${configured}'`,
            };
        }
        if (!parsed.hostname) {
            return {
                baseUrl: configured,
                error: `IA_BASE_URL host is missing. Received '${configured}'`,
            };
        }
        const normalized = parsed.toString().replace(/\/+$/, '');
        return { baseUrl: normalized, error: null };
    }
    catch {
        return {
            baseUrl: configured,
            error: `IA_BASE_URL is invalid or not resolvable: '${configured}'`,
        };
    }
}
function normalizeEmotion(input) {
    if (!input)
        return null;
    const normalized = normalizeKey(input);
    const map = {
        joy: 'Joy',
        alegria: 'Joy',
        happy: 'Joy',
        felicidad: 'Joy',
        love: 'Love',
        amor: 'Love',
        surprise: 'Surprise',
        sorpresa: 'Surprise',
        sadness: 'Sadness',
        triste: 'Sadness',
        tristeza: 'Sadness',
        anger: 'Anger',
        enojo: 'Anger',
        ira: 'Anger',
        rabia: 'Anger',
        fear: 'Fear',
        miedo: 'Fear',
        temor: 'Fear',
        neutral: 'Neutral',
        neutro: 'Neutral',
    };
    return map[normalized] ?? null;
}
function normalizeConfidence(input) {
    if (typeof input === 'number' && Number.isFinite(input)) {
        return clamp(input, 0, 1);
    }
    if (typeof input === 'string' && input.trim().length > 0) {
        const parsed = Number.parseFloat(input.trim());
        if (Number.isFinite(parsed)) {
            return clamp(parsed, 0, 1);
        }
    }
    return null;
}
function normalizeKey(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
//# sourceMappingURL=ai.service.js.map