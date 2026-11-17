import { Module } from "@nestjs/common";
import { SandboxService } from "./sandbox.service";
import { SandboxController } from "./sandbox.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [SandboxService],
  controllers: [SandboxController],
  exports: [SandboxService],
})
export class SandboxModule {}
