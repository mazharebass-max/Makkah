import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SandboxModule } from "../sandbox/sandbox.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule, SandboxModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
