import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { AdminModule } from "./modules/admin/admin.module";
import { HealthController } from "./modules/health/health.controller";
import { SandboxModule } from "./modules/sandbox/sandbox.module";
import { OwnershipModule } from "./modules/ownership/ownership.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { FleetModule } from "./modules/fleet/fleet.module";
import { ProvidersModule } from "./modules/providers/providers.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SupportModule } from "./modules/support/support.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { OpsModule } from "./modules/ops/ops.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { SecurityHeadersMiddleware } from "./common/security-headers.middleware";
import { CommonModule } from "./common/common.module";

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    OwnershipModule,
    AuthModule,
    CatalogModule,
    PricingModule,
    BookingsModule,
    FleetModule,
    ProvidersModule,
    PaymentsModule,
    NotificationsModule,
    SupportModule,
    AnalyticsModule,
    OpsModule,
    SettingsModule,
    MarketingModule,
    AdminModule,
    SandboxModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes("*");
  }
}



