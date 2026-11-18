import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsObject } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SettingsService } from "./settings.service";

class SetFlagDto {
  @IsBoolean()
  enabled!: boolean;
}

class PutSettingDto {
  @IsObject()
  value!: Record<string, unknown>;
}

@Controller()
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get("feature-flags")
  featureFlagsPublic() {
    return this.settings.listFeatureFlagsPublic();
  }

  @Get("pickup-points")
  pickupPoints(@Query("zoneCode") zoneCode?: string) {
    return this.settings.listPickupPoints(zoneCode);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER)
  @Get("admin/settings/feature-flags")
  adminFlags() {
    return this.settings.listFeatureFlagsAdmin();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  @Patch("admin/settings/feature-flags/:key")
  setFlag(
    @Req() req: AuthedRequest,
    @Param("key") key: string,
    @Body() body: SetFlagDto,
  ) {
    return this.settings.setFeatureFlag(req.user!, key, body.enabled);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER)
  @Get("admin/settings/system")
  systemSettings() {
    return this.settings.listSystemSettings();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  @Put("admin/settings/system/:key")
  putSetting(
    @Req() req: AuthedRequest,
    @Param("key") key: string,
    @Body() body: PutSettingDto,
  ) {
    return this.settings.putSystemSetting(req.user!, key, body.value);
  }
}
