import { Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { OwnershipService } from "../ownership/ownership.service";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
  ) {}

  @Get("bookings")
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.FLEET_DISPATCHER,
    RoleCode.FINANCE_OFFICER,
    RoleCode.SUPPORT_AGENT,
  )
  async listBookings() {
    const bookings = await this.prisma.booking.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { route: true, category: true },
    });
    return { data: bookings };
  }

  @Post("bookings/:id/assign")
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.FLEET_DISPATCHER)
  async assign(@Param("id") id: string, @Req() req: AuthedRequest) {
    await this.ownership.assertBookingAccess(req.user!, id);
    await this.prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        action: "admin.booking.assign_stub",
        resource: "booking",
        resourceId: id,
        metadata: { note: "M1 stub — concurrency-safe assign lands in M3" },
      },
    });
    return {
      ok: true,
      mode: "stub",
      message: "Assignment endpoint authenticated; full dispatch in M3",
      bookingId: id,
    };
  }

  @Post("providers/:id/review")
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER)
  async reviewProvider(@Param("id") id: string, @Req() req: AuthedRequest) {
    await this.ownership.assertProviderAccess(req.user!, id);
    await this.prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        action: "admin.provider.review_stub",
        resource: "provider",
        resourceId: id,
        metadata: {
          note: "Human verification required — never auto-approve fabricated licences",
        },
      },
    });
    return {
      ok: true,
      mode: "stub",
      message: "Review recorded as audit stub; approval workflow completes in M4",
      providerId: id,
    };
  }

  @Get("finance/reconciliation")
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.FINANCE_OFFICER)
  async reconciliation() {
    return {
      mode: "sandbox",
      message: "Finance reconciliation placeholder — no live gateway claims",
      totals: { capturedHalalas: 0, refundedHalalas: 0, currency: "SAR" },
    };
  }
}
