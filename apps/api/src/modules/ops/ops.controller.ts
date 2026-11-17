import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { OpsService } from "./ops.service";

@Controller()
export class OpsController {
  constructor(@Inject(OpsService) private readonly ops: OpsService) {}

  /** Public staging probe — never asserts regulatory clearance. */
  @Get("ops/readiness")
  readiness() {
    return this.ops.readiness();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER, RoleCode.SUPPORT_AGENT)
  @Get("admin/ops/compliance-gate")
  compliance(@Req() _req: AuthedRequest) {
    return this.ops.complianceGate();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER)
  @Get("admin/ops/security-checklist")
  security(@Req() _req: AuthedRequest) {
    return this.ops.securityChecklist();
  }
}
