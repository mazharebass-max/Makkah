import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ComplianceController } from "./compliance.controller";
import { ProvidersController } from "./providers.controller";
import { ProvidersService } from "./providers.service";

@Module({
  imports: [AuthModule],
  providers: [ProvidersService],
  controllers: [ProvidersController, ComplianceController],
  exports: [ProvidersService],
})
export class ProvidersModule {}
