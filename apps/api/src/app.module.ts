import { Module } from "@nestjs/common";
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

@Module({
  imports: [
    PrismaModule,
    OwnershipModule,
    AuthModule,
    CatalogModule,
    PricingModule,
    BookingsModule,
    FleetModule,
    ProvidersModule,
    PaymentsModule,
    AdminModule,
    SandboxModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}


