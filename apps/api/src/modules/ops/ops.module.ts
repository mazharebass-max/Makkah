import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";

@Module({
  imports: [AuthModule],
  providers: [OpsService],
  controllers: [OpsController],
  exports: [OpsService],
})
export class OpsModule {}
