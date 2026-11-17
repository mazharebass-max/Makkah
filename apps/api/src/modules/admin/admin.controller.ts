import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { RoleCode } from "@haramain/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
