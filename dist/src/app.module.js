"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const accounts_module_1 = require("./accounts/accounts.module");
const ai_module_1 = require("./ai/ai.module");
const analytics_module_1 = require("./analytics/analytics.module");
const auth_module_1 = require("./auth/auth.module");
const clients_module_1 = require("./clients/clients.module");
const comments_module_1 = require("./comments/comments.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const health_module_1 = require("./health/health.module");
const instagram_module_1 = require("./instagram/instagram.module");
const meta_module_1 = require("./integrations/meta/meta.module");
const metrics_module_1 = require("./metrics/metrics.module");
const posts_module_1 = require("./posts/posts.module");
const prisma_module_1 = require("./prisma/prisma.module");
const scheduler_module_1 = require("./scheduler/scheduler.module");
const security_module_1 = require("./security/security.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            security_module_1.SecurityModule,
            auth_module_1.AuthModule,
            ai_module_1.AiModule,
            health_module_1.HealthModule,
            clients_module_1.ClientsModule,
            comments_module_1.CommentsModule,
            accounts_module_1.AccountsModule,
            meta_module_1.MetaModule,
            posts_module_1.PostsModule,
            analytics_module_1.AnalyticsModule,
            dashboard_module_1.DashboardModule,
            metrics_module_1.MetricsModule,
            instagram_module_1.InstagramModule,
            scheduler_module_1.SchedulerModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map