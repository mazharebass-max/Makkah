import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import type { CreateBookingInput, CreateQuoteInput, SearchAvailabilityInput } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { AvailabilityService } from "../bookings/availability.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  buildQuoteLines,
  DRAFT_CANCELLATION_POLICY,
} from "./pricing.math";

const TRIP_DURATION_MS = 3 * 60 * 60 * 1000;
const QUOTE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class QuoteService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private parseSchedule(raw: string): Date {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException({ code: "INVALID_SCHEDULE", message: "Invalid scheduledAt" });
    }
    if (d.getTime() < Date.now() - 60_000) {
      throw new BadRequestException({
        code: "SCHEDULE_IN_PAST",
        message: "Scheduled time must be in the future",
      });
    }
    return d;
  }

  private async getRoute(routeCode: string) {
    const route = await this.prisma.route.findFirst({
      where: { code: routeCode, active: true },
      include: { fromZone: true, toZone: true },
    });
    if (!route) {
      throw new NotFoundException({ code: "ROUTE_NOT_FOUND", message: "Route not found" });
    }
    return route;
  }

  async countAvailableVehicles(input: {
    categoryId: string;
    passengerCapMin: number;
    luggageCapMin: number;
    startsAt: Date;
    endsAt: Date;
    excludeQuoteId?: string;
  }) {
    await this.availability.releaseExpiredHolds();
    return this.availability.countAvailable(input);
  }

  async search(input: SearchAvailabilityInput) {
    const passengers = Number(input.passengers);
    const luggage = Number(input.luggage ?? 0);
    const scheduledAt = this.parseSchedule(input.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + TRIP_DURATION_MS);
    const route = await this.getRoute(input.routeCode);

    const categories = await this.prisma.vehicleCategory.findMany({
      where: { active: true },
      orderBy: { passengerCap: "asc" },
      include: {
        pricing: {
          where: { active: true },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    });

    const results = [];
    for (const cat of categories) {
      const fits = cat.passengerCap >= passengers && cat.luggageCap >= luggage;
      const availableCount = fits
        ? await this.countAvailableVehicles({
            categoryId: cat.id,
            passengerCapMin: passengers,
            luggageCapMin: luggage,
            startsAt: scheduledAt,
            endsAt,
          })
        : 0;

      const version = cat.pricing[0]?.versions[0];
      let estimate = null;
      if (version) {
        const priced = buildQuoteLines({
          baseHalalas: version.baseHalalas,
          passengers,
          luggage,
          currency: version.currency,
        });
        estimate = {
          currency: priced.currency,
          totalHalalas: priced.totalHalalas,
          lines: priced.lines,
          pricingVersion: version.version,
        };
      }

      results.push({
        category: {
          id: cat.id,
          code: cat.code,
          nameEn: cat.nameEn,
          nameAr: cat.nameAr,
          passengerCap: cat.passengerCap,
          luggageCap: cat.luggageCap,
          draftLabel: cat.draftLabel,
        },
        fitsCapacity: fits,
        available: availableCount > 0,
        availableCount,
        unavailableReason: !fits
          ? "CAPACITY"
          : availableCount === 0
            ? "NO_INVENTORY"
            : null,
        estimate,
      });
    }

    return {
      route: {
        id: route.id,
        code: route.code,
        nameEn: route.nameEn,
        nameAr: route.nameAr,
        draftLabel: route.draftLabel,
        from: {
          code: route.fromZone.code,
          nameEn: route.fromZone.nameEn,
          nameAr: route.fromZone.nameAr,
        },
        to: {
          code: route.toZone.code,
          nameEn: route.toZone.nameEn,
          nameAr: route.toZone.nameAr,
        },
      },
      scheduledAt: scheduledAt.toISOString(),
      passengers,
      luggage,
      cancellationPolicy: DRAFT_CANCELLATION_POLICY,
      inventoryNote:
        "Availability reflects synthetic owned-fleet seed rows only — not live market supply",
      data: results,
    };
  }

  async createQuote(input: CreateQuoteInput) {
    const passengers = Number(input.passengers);
    const luggage = Number(input.luggage ?? 0);
    const scheduledAt = this.parseSchedule(input.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + TRIP_DURATION_MS);
    const route = await this.getRoute(input.routeCode);
    const category = await this.prisma.vehicleCategory.findFirst({
      where: { code: input.categoryCode, active: true },
      include: {
        pricing: {
          where: { active: true },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        },
      },
    });
    if (!category) {
      throw new NotFoundException({
        code: "CATEGORY_NOT_FOUND",
        message: "Vehicle category not found",
      });
    }
    if (category.passengerCap < passengers || category.luggageCap < luggage) {
      throw new BadRequestException({
        code: "CAPACITY_EXCEEDED",
        message: "Category cannot serve requested passengers/luggage",
      });
    }

    const availableCount = await this.countAvailableVehicles({
      categoryId: category.id,
      passengerCapMin: passengers,
      luggageCapMin: luggage,
      startsAt: scheduledAt,
      endsAt,
    });
    if (availableCount < 1) {
      throw new BadRequestException({
        code: "UNAVAILABLE",
        message: "No eligible vehicles available for this request",
        details: { availableCount: 0 },
      });
    }

    const version = category.pricing[0]?.versions[0];
    if (!version) {
      throw new BadRequestException({
        code: "NO_PRICING",
        message: "No draft pricing rule for category",
      });
    }

    const priced = buildQuoteLines({
      baseHalalas: version.baseHalalas,
      passengers,
      luggage,
      currency: version.currency,
    });

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
    const quote = await this.prisma.quote.create({
      data: {
        routeId: route.id,
        categoryId: category.id,
        currency: priced.currency,
        totalHalalas: priced.totalHalalas,
        expiresAt,
        pricingVersion: version.version,
        scheduledAt,
        passengers,
        luggage,
        lines: {
          create: priced.lines.map((l) => ({
            label: `${l.label} [${l.draftLabel}]`,
            amountHalalas: l.amountHalalas,
          })),
        },
      },
      include: { lines: true, route: true, category: true },
    });

    // Soft category hold until quote expiry — reduces availableCount for others
    await this.availability.createHold({
      categoryId: category.id,
      quoteId: quote.id,
      startsAt: scheduledAt,
      endsAt,
      expiresAt,
    });

    return {
      id: quote.id,
      expiresAt: quote.expiresAt.toISOString(),
      currency: quote.currency,
      totalHalalas: quote.totalHalalas,
      pricingVersion: quote.pricingVersion,
      scheduledAt: quote.scheduledAt.toISOString(),
      passengers,
      luggage,
      route: {
        code: quote.route.code,
        nameEn: quote.route.nameEn,
        nameAr: quote.route.nameAr,
        draftLabel: quote.route.draftLabel,
      },
      category: {
        code: quote.category.code,
        nameEn: quote.category.nameEn,
        nameAr: quote.category.nameAr,
        passengerCap: quote.category.passengerCap,
        luggageCap: quote.category.luggageCap,
        draftLabel: quote.category.draftLabel,
      },
      lines: priced.lines,
      cancellationPolicy: DRAFT_CANCELLATION_POLICY,
      availableCount,
    };
  }

  async getQuote(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { lines: true, route: true, category: true },
    });
    if (!quote) {
      throw new NotFoundException({ code: "QUOTE_NOT_FOUND", message: "Quote not found" });
    }
    const expired = quote.expiresAt.getTime() < Date.now();
    return {
      id: quote.id,
      expired,
      expiresAt: quote.expiresAt.toISOString(),
      currency: quote.currency,
      totalHalalas: quote.totalHalalas,
      scheduledAt: quote.scheduledAt.toISOString(),
      passengers: quote.passengers,
      luggage: quote.luggage,
      route: {
        code: quote.route.code,
        nameEn: quote.route.nameEn,
        nameAr: quote.route.nameAr,
        draftLabel: quote.route.draftLabel,
      },
      category: {
        code: quote.category.code,
        nameEn: quote.category.nameEn,
        nameAr: quote.category.nameAr,
        draftLabel: quote.category.draftLabel,
      },
      lines: quote.lines.map((l) => ({
        label: l.label,
        amountHalalas: l.amountHalalas,
      })),
      cancellationPolicy: DRAFT_CANCELLATION_POLICY,
    };
  }

  private bookingReference() {
    return `HR-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  async createBooking(userId: string, input: CreateBookingInput) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key: input.idempotencyKey },
      });
      if (existing?.response) {
        return existing.response as Record<string, unknown>;
      }
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: { route: true, category: true, lines: true },
    });
    if (!quote) {
      throw new NotFoundException({ code: "QUOTE_NOT_FOUND", message: "Quote not found" });
    }
    if (quote.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ code: "QUOTE_EXPIRED", message: "Quote has expired" });
    }

    const endsAt = new Date(quote.scheduledAt.getTime() + TRIP_DURATION_MS);
    const availableCount = await this.countAvailableVehicles({
      categoryId: quote.categoryId,
      passengerCapMin: quote.passengers,
      luggageCapMin: quote.luggage,
      startsAt: quote.scheduledAt,
      endsAt,
      excludeQuoteId: quote.id,
    });
    if (availableCount < 1) {
      throw new BadRequestException({
        code: "UNAVAILABLE",
        message: "No eligible vehicles available for this quote anymore",
      });
    }

    await this.prisma.customerProfile.updateMany({
      where: { userId },
      data: {
        displayName: input.contactName,
        phoneE164: input.contactPhone,
      },
    });

    const booking = await this.prisma.booking.create({
      data: {
        reference: this.bookingReference(),
        customerId: userId,
        routeId: quote.routeId,
        categoryId: quote.categoryId,
        quoteId: quote.id,
        status: BookingStatus.PENDING_PAYMENT,
        scheduledAt: quote.scheduledAt,
        passengerCount: quote.passengers,
        luggageCount: quote.luggage,
        currency: quote.currency,
        totalHalalas: quote.totalHalalas,
        priceSnapshot: {
          lines: quote.lines,
          cancellationPolicy: DRAFT_CANCELLATION_POLICY,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          specialInstructions: input.specialInstructions ?? null,
          draftLabel: "DRAFT — OWNER APPROVAL REQUIRED",
        },
        statusEvents: {
          create: {
            toStatus: BookingStatus.PENDING_PAYMENT,
            actorId: userId,
            note: "Checkout draft created — sandbox payment only",
          },
        },
      },
    });

    // Attach hold to booking and extend briefly for checkout
    await this.prisma.availabilityHold.updateMany({
      where: { quoteId: quote.id, releasedAt: null },
      data: {
        bookingId: booking.id,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notifications.enqueue("notification.booking_created", {
      userId,
      bookingId: booking.id,
      toEmail: user?.email,
      templateCode: "booking_created",
      vars: { reference: booking.reference },
      dedupeKey: `booking_created:${booking.id}`,
    });

    const payload = {
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        totalHalalas: booking.totalHalalas,
        currency: booking.currency,
        scheduledAt: booking.scheduledAt.toISOString(),
      },
      paymentHint: {
        mode: "sandbox",
        next: "POST /api/v1/payments/checkout with amountHalalas — never claims live capture",
      },
    };

    if (input.idempotencyKey) {
      await this.prisma.idempotencyKey.create({
        data: {
          key: input.idempotencyKey,
          userId,
          response: payload,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return payload;
  }
}
