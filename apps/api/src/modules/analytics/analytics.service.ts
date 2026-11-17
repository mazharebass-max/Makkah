import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async track(input: {
    userId?: string;
    name: string;
    props?: Record<string, unknown>;
    source?: string;
  }) {
    const row = await this.prisma.analyticsEvent.create({
      data: {
        userId: input.userId,
        name: input.name.slice(0, 120),
        props: (input.props ?? {}) as Prisma.InputJsonValue,
        source: input.source ?? "web",
      },
    });
    return { id: row.id, recorded: true };
  }

  async summary() {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const grouped = await this.prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { name: "desc" } },
      take: 20,
    });
    const [bookings, notifications, tickets] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.notification.count(),
      this.prisma.supportTicket.count({ where: { status: "OPEN" } }),
    ]);
    return {
      windowDays: 7,
      events: grouped.map((g) => ({ name: g.name, count: g._count })),
      totals: {
        bookings,
        notifications,
        openSupportTickets: tickets,
      },
    };
  }
}
