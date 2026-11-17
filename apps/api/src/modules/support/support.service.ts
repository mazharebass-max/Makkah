import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupportTicketStatus } from "@prisma/client";
import { RoleCode } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { OwnershipService } from "../ownership/ownership.service";
import type { RequestUser } from "../auth/auth.types";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SupportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async createTicket(
    user: RequestUser,
    input: { subject: string; body: string; bookingId?: string },
  ) {
    if (input.bookingId) {
      await this.ownership.assertBookingAccess(user, input.bookingId);
    }
    const ticket = await this.prisma.supportTicket.create({
      data: {
        requesterId: user.id,
        bookingId: input.bookingId,
        subject: input.subject,
        messages: {
          create: { authorId: user.id, body: input.body },
        },
      },
      include: { messages: true },
    });
    await this.notifications.enqueue("notification.support", {
      userId: user.id,
      toEmail: user.email,
      templateCode: "booking_status",
      vars: { reference: ticket.id.slice(0, 8), status: "SUPPORT_OPEN" },
      dedupeKey: `support:open:${ticket.id}`,
      bookingId: input.bookingId,
    });
    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      bookingId: ticket.bookingId,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  async listMine(user: RequestUser) {
    const isStaff = this.ownership.hasAnyRole(user, [
      RoleCode.SUPPORT_AGENT,
      RoleCode.SUPER_ADMIN,
    ]);
    const tickets = await this.prisma.supportTicket.findMany({
      where: isStaff ? undefined : { requesterId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true } } },
    });
    return {
      data: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        bookingId: t.bookingId,
        messageCount: t._count.messages,
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  }

  async getTicket(user: RequestUser, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { email: true } } } },
      },
    });
    if (!ticket) throw new NotFoundException({ code: "NOT_FOUND", message: "Ticket not found" });
    const isStaff = this.ownership.hasAnyRole(user, [
      RoleCode.SUPPORT_AGENT,
      RoleCode.SUPER_ADMIN,
    ]);
    if (!isStaff && ticket.requesterId !== user.id) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Not your ticket" });
    }
    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      bookingId: ticket.bookingId,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        body: m.body,
        authorEmail: m.author.email,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async addMessage(user: RequestUser, ticketId: string, body: string) {
    const ticket = await this.getTicket(user, ticketId);
    const msg = await this.prisma.supportMessage.create({
      data: { ticketId, authorId: user.id, body },
    });
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status:
          ticket.status === SupportTicketStatus.RESOLVED
            ? SupportTicketStatus.OPEN
            : ticket.status === SupportTicketStatus.CLOSED
              ? SupportTicketStatus.OPEN
              : undefined,
      },
    });
    return { id: msg.id, createdAt: msg.createdAt.toISOString() };
  }

  async setStatus(user: RequestUser, ticketId: string, status: SupportTicketStatus) {
    if (
      !this.ownership.hasAnyRole(user, [RoleCode.SUPPORT_AGENT, RoleCode.SUPER_ADMIN])
    ) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Staff only" });
    }
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
    return { id: ticket.id, status: ticket.status };
  }
}
