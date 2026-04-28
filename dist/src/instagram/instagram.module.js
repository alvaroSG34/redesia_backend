"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramModule = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const ai_module_1 = require("../ai/ai.module");
const metrics_module_1 = require("../metrics/metrics.module");
const security_module_1 = require("../security/security.module");
const instagram_service_1 = require("./instagram.service");
let InstagramModule = class InstagramModule {
};
exports.InstagramModule = InstagramModule;
exports.InstagramModule = InstagramModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, security_module_1.SecurityModule, metrics_module_1.MetricsModule, ai_module_1.AiModule],
        providers: [instagram_service_1.InstagramService],
        exports: [instagram_service_1.InstagramService],
    })
], InstagramModule);
//# sourceMappingURL=instagram.module.js.map