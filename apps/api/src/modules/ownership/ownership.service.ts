import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { RoleCode } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

const STAFF_OVERRIDE: RoleCode[] = [
  RoleCode.SUPER_ADMIN,
  RoleCode.FLEET_DISPATCHER,
  RoleCode.SUPPORT_AGENT,
  RoleCode.FINANCE_OFFICER,
  RoleCode.COMPLIANCE_OFFICER,
];

@Injectable()
export class OwnershipService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  hasAnyRole(user: RequestUser, roles: RoleCode[]) {
    return roles.some((r) => user.roles.includes(r));
  }

  assertStaffOrSelf(user: RequestUser, ownerUserId: string) {
    if (user.id === ownerUserId) return;
    if (this.hasAnyRole(user, STAFF_OVERRIDE)) return;
    throw new ForbiddenException({ code: "FORBIDDEN", message: "Not allowed for this resource" });
  }

  async assertBookingAccess(user: RequestUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "NOT_FOUND", message: "Booking not found" });
    if (booking.customerId === user.id) return booking;
    if (this.hasAnyRole(user, STAFF_OVERRIDE)) return booking;

    if (user.roles.includes(RoleCode.PROVIDER_ADMIN) || user.roles.includes(RoleCode.PROVIDER_DISPATCHER)) {
      const assignment = await this.prisma.bookingAssignment.findUnique({ where: { bookingId } });
      const providerId = user.providerId;
      if (assignment?.providerId && providerId && assignment.providerId === providerId) {
        return booking;
      }
    }

    if (user.roles.includes(RoleCode.DRIVER)) {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.id } });
      const assignment = await this.prisma.bookingAssignment.findUnique({ where: { bookingId } });
      if (driver && assignment?.driverId === driver.id) return booking;
    }

    throw new ForbiddenException({ code: "FORBIDDEN", message: "Booking ownership check failed" });
  }

  async assertProviderAccess(user: RequestUser, providerId: string) {
    if (this.hasAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.COMPLIANCE_OFFICER])) return;
    if (user.providerId === providerId) return;
    throw new ForbiddenException({ code: "FORBIDDEN", message: "Provider isolation enforced" });
  }
}
