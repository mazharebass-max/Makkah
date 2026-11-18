import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FleetService } from "./fleet.service";

class ActiveDto {
  @IsBoolean()
  active!: boolean;
}

class CreateShiftDto {
  @IsUUID()
  driverId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}

@Controller("admin/fleet")
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.OWNED_FLEET_MANAGER, RoleCode.FLEET_DISPATCHER)
export class FleetController {
  constructor(@Inject(FleetService) private readonly fleet: FleetService) {}

  @Get("vehicles")
  vehicles() {
    return this.fleet.listOwnedVehicles();
  }

  @Get("drivers")
  drivers() {
    return this.fleet.listOwnedDrivers();
  }

  @Get("drivers/:id/shifts")
  shifts(@Param("id") id: string) {
    return this.fleet.listDriverShifts(id);
  }

  @Post("driver-shifts")
  createShift(@Req() req: AuthedRequest, @Body() body: CreateShiftDto) {
    return this.fleet.createDriverShift(body, req.user!.id);
  }

  @Patch("vehicles/:id/active")
  setActive(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: ActiveDto) {
    return this.fleet.setVehicleActive(id, body.active, req.user!.id);
  }
}
