import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ProviderStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ProvidersService } from "./providers.service";

class ReviewDto {
  @IsEnum(ProviderStatus)
  toStatus!: ProviderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  decision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

class SuspendDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  reason!: string;
}

@Controller("admin/compliance")
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.COMPLIANCE_OFFICER, RoleCode.SUPER_ADMIN)
export class ComplianceController {
  constructor(@Inject(ProvidersService) private readonly providers: ProvidersService) {}

  @Get("providers")
  queue(@Query("status") status?: string) {
    const statuses = status
      ? (status.split(",").map((s) => s.trim()) as ProviderStatus[])
      : undefined;
    return this.providers.listComplianceQueue(statuses);
  }

  @Get("providers/:id")
  detail(@Param("id") id: string) {
    return this.providers.getComplianceDetail(id);
  }

  @Post("providers/:id/review")
  review(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: ReviewDto) {
    return this.providers.review(req.user!, id, body);
  }

  @Post("providers/:id/suspend")
  suspend(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: SuspendDto) {
    return this.providers.suspend(req.user!, id, body.reason);
  }

  @Post("expire-documents")
  expire() {
    return this.providers.expireDocuments().then((count) => ({
      expiredCount: count,
      message: "Marked past-expiry documents as EXPIRED — does not invent new licences",
    }));
  }
}
