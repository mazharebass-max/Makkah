import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { MarketingPostStatus } from "@prisma/client";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { MarketingService } from "./marketing.service";

class UpsertDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titleEn!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2200)
  captionEn!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2200)
  captionAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  visualHint?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsEnum(MarketingPostStatus)
  status?: MarketingPostStatus;
}

class ScheduleDto {
  @IsString()
  scheduledAt!: string;
}

@Controller()
export class MarketingController {
  constructor(@Inject(MarketingService) private readonly marketing: MarketingService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Get("admin/marketing/posts")
  list(@Query("status") status?: MarketingPostStatus) {
    return this.marketing.list(status);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Post("admin/marketing/posts")
  create(@Req() req: AuthedRequest, @Body() body: UpsertDto) {
    return this.marketing.create(req.user!, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Patch("admin/marketing/posts/:id")
  update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: UpsertDto) {
    return this.marketing.update(req.user!, id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Post("admin/marketing/posts/:id/approve")
  approve(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.marketing.approve(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Post("admin/marketing/posts/:id/schedule")
  schedule(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: ScheduleDto) {
    return this.marketing.schedule(req.user!, id, body.scheduledAt);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.SUPPORT_AGENT)
  @Post("admin/marketing/process-due")
  processDue() {
    return this.marketing.processDue(25);
  }
}
