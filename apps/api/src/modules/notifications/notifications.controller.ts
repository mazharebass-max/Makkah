import {
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @UseGuards(AuthGuard)
  @Get("notifications/me")
  mine(@Req() req: AuthedRequest) {
    return this.notifications.listMine(req.user!.id);
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
