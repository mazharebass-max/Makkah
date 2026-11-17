import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AnalyticsService } from "./analytics.service";

class TrackDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

@Controller()
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Post("analytics/events")
  track(@Body() body: TrackDto) {
    return this.analytics.track({
      name: body.name,
      props: body.props,
      source: body.source ?? "web",
    });
  }

  @UseGuards(AuthGuard)
  @Post("analytics/events/authed")
  trackAuthed(@Req() req: AuthedRequest, @Body() body: TrackDto) {
    return this.analytics.track({
      userId: req.user!.id,
      name: body.name,
      props: body.props,
      source: body.source ?? "app",
    });
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.FINANCE_OFFICER, RoleCode.SUPPORT_AGENT)
  @Get("admin/analytics/summary")
  summary() {
    return this.analytics.summary();
  }
}
