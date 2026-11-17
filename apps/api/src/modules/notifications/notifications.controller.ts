import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { IsEmail } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { NotificationsService } from "./notifications.service";
import { randomInt } from "node:crypto";

class OtpDto {
  @IsEmail()
  email!: string;
}

@Controller()
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @UseGuards(AuthGuard)
  @Get("notifications/me")
  mine(@Req() req: AuthedRequest) {
    return this.notifications.listMine(req.user!.id);
  }

  /** Sandbox OTP — queues outbox email, never claims live delivery. */
  @Post("auth/otp/request")
  async requestOtp(@Body() body: OtpDto) {
    const code = String(randomInt(100000, 999999));
    const queued = await this.notifications.enqueueOtp({ email: body.email, code });
    // Process immediately in API for local/dev so inbox shows sandbox send
    const processed = await this.notifications.processOutbox(10);
    return {
      ...queued,
      debugCode: code, // sandbox only — never use in production claims
      processed,
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Get("admin/notifications/queue")
  queue() {
    return this.notifications.adminQueue();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Post("admin/notifications/process-outbox")
  process() {
    return this.notifications.processOutbox(100);
  }

  /** BullMQ worker drain — sandbox secret only, never live SMS/email providers. */
  @Post("internal/outbox/process")
  async processInternal(@Headers("x-worker-secret") secret?: string) {
    const expected = process.env.WORKER_SECRET ?? "dev-worker-secret";
    if (!secret || secret !== expected) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid worker secret",
      });
    }
    return this.notifications.processOutbox(100);
  }
}
