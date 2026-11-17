import { Body, Controller, Get, Inject, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FleetService } from "./fleet.service";

class ActiveDto {
  @IsBoolean()
  active!: boolean;
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

  @Patch("vehicles/:id/active")
  setActive(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: ActiveDto) {
    return this.fleet.setVehicleActive(id, body.active, req.user!.id);
  }
}
