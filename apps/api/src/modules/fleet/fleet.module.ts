import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FleetController } from "./fleet.controller";
import { FleetService } from "./fleet.service";

@Module({
  imports: [AuthModule],
  providers: [FleetService],
  controllers: [FleetController],
  exports: [FleetService],
})
export class FleetModule {}
