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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaController = void 0;
const common_1 = require("@nestjs/common");
const meta_service_1 = require("./meta.service");
let MetaController = class MetaController {
    metaService;
    constructor(metaService) {
        this.metaService = metaService;
    }
    async handleCallback(state, code, res) {
        const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
        try {
            const result = await this.metaService.handleCallback(state, code);
            const redirectUrl = new URL(`/clients/${result.clientId}/accounts`, frontendOrigin);
            redirectUrl.searchParams.set('connected', 'true');
            redirectUrl.searchParams.set('accountId', result.accountId);
            return res.redirect(302, redirectUrl.toString());
        }
        catch (error) {
            const redirectUrl = new URL('/clients', frontendOrigin);
            const message = error instanceof Error
                ? error.message
                : 'No se pudo completar la conexion con Meta';
            redirectUrl.searchParams.set('oauthError', message);
            return res.redirect(302, redirectUrl.toString());
        }
    }
};
exports.MetaController = MetaController;
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('state')),
    __param(1, (0, common_1.Query)('code')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MetaController.prototype, "handleCallback", null);
exports.MetaController = MetaController = __decorate([
    (0, common_1.Controller)('v1/integrations/meta'),
    __metadata("design:paramtypes", [meta_service_1.MetaService])
], MetaController);
//# sourceMappingURL=meta.controller.js.map