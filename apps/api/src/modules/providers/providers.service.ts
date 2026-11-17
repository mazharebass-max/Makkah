import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DocumentReviewState,
  FleetOwnership,
  ProviderStatus,
} from "@prisma/client";
import { RoleCode } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { OwnershipService } from "../ownership/ownership.service";
import type { RequestUser } from "../auth/auth.types";
import * as argon2 from "argon2";

const DRAFT = "DRAFT — OWNER APPROVAL REQUIRED";

const ALLOWED_REVIEW: Record<ProviderStatus, ProviderStatus[]> = {
  APPLIED: [ProviderStatus.IN_REVIEW, ProviderStatus.NEEDS_INFORMATION, ProviderStatus.REJECTED],
  IN_REVIEW: [
    ProviderStatus.APPROVED,
    ProviderStatus.NEEDS_INFORMATION,
    ProviderStatus.REJECTED,
    ProviderStatus.SUSPENDED,
  ],
  NEEDS_INFORMATION: [ProviderStatus.IN_REVIEW, ProviderStatus.REJECTED, ProviderStatus.APPLIED],
  APPROVED: [ProviderStatus.SUSPENDED, ProviderStatus.IN_REVIEW],
  SUSPENDED: [ProviderStatus.IN_REVIEW, ProviderStatus.APPROVED, ProviderStatus.REJECTED],
  REJECTED: [ProviderStatus.APPLIED, ProviderStatus.IN_REVIEW],
};

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OwnershipService) private readonly ownership: OwnershipService,
  ) {}

  /** Public/applicant onboarding — always starts APPLIED; never auto-approved. */
  async apply(input: {
    email: string;
    password: string;
    legalName: string;
    tradeName?: string;
    registrationNo?: string;
    locale?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({ code: "EMAIL_TAKEN", message: "Email already registered" });
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { code: RoleCode.PROVIDER_APPLICANT },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          locale: input.locale ?? "en",
          identities: {
            create: { provider: "email", subject: input.email, verifiedAt: new Date() },
          },
          roleAssignments: { create: { roleId: role.id } },
        },
      });

      const provider = await tx.provider.create({
        data: {
          userId: user.id,
          legalName: input.legalName,
          tradeName: input.tradeName,
          registrationNo: input.registrationNo,
          status: ProviderStatus.APPLIED,
          ownership: FleetOwnership.THIRD_PARTY,
          notes: `${DRAFT} — applicant submission; human verification required`,
        },
      });

      await tx.roleAssignment.updateMany({
        where: { userId: user.id, roleId: role.id },
        data: { providerId: provider.id },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "providers.apply",
          resource: "provider",
          resourceId: provider.id,
          metadata: { status: ProviderStatus.APPLIED, autoApproved: false },
        },
      });

      return { user, provider };
    });

    return {
      provider: this.publicProvider(result.provider),
      message:
        "Application received as APPLIED. Licence verification is human-gated — not auto-approved.",
    };
  }

  async getMine(user: RequestUser) {
    const provider = await this.requireOwnProvider(user);
    const docs = await this.prisma.providerDocument.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
    });
    const reviews = await this.prisma.providerReview.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      provider: this.publicProvider(provider),
      documents: docs.map((d) => this.publicDoc(d)),
      reviews: reviews.map((r) => ({
        id: r.id,
        decision: r.decision,
        toStatus: r.toStatus,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async addDocument(
    user: RequestUser,
    input: { docType: string; storageKey: string; expiresAt?: string },
  ) {
    const provider = await this.requireOwnProvider(user);
    if (!input.storageKey.startsWith("sandbox://")) {
      throw new BadRequestException({
        code: "SANDBOX_STORAGE_ONLY",
        message: "M4 accepts sandbox:// storage keys only — no live object store claims",
      });
    }
    const doc = await this.prisma.providerDocument.create({
      data: {
        providerId: provider.id,
        docType: input.docType,
        storageKey: input.storageKey,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        reviewState: DocumentReviewState.SUBMITTED,
        draftLabel: DRAFT,
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "providers.document.upload",
        resource: "provider_document",
        resourceId: doc.id,
        metadata: { providerId: provider.id, docType: input.docType, verified: false },
      },
    });
    return this.publicDoc(doc);
  }

  async listDrivers(user: RequestUser) {
    const provider = await this.requireOwnProvider(user);
    const drivers = await this.prisma.driver.findMany({
      where: { providerId: provider.id },
      include: { documents: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      data: drivers.map((d) => ({
        id: d.id,
        displayName: d.displayName,
        phoneE164: d.phoneE164,
        active: d.active,
        ownership: d.ownership,
        documents: d.documents.map((doc) => ({
          id: doc.id,
          docType: doc.docType,
          reviewState: doc.reviewState,
          expiresAt: doc.expiresAt?.toISOString() ?? null,
          draftLabel: doc.draftLabel,
        })),
      })),
    };
  }

  /** Driver onboarding stub for provider-owned drivers — documents remain unverified. */
  async addDriver(
    user: RequestUser,
    input: {
      displayName: string;
      phoneE164?: string;
      licenceStorageKey?: string;
      licenceExpiresAt?: string;
    },
  ) {
    const provider = await this.requireOwnProvider(user);
    if (provider.status === ProviderStatus.SUSPENDED || provider.status === ProviderStatus.REJECTED) {
      throw new ForbiddenException({
        code: "PROVIDER_INACTIVE",
        message: "Suspended/rejected providers cannot onboard drivers",
      });
    }
    const driver = await this.prisma.driver.create({
      data: {
        providerId: provider.id,
        ownership: FleetOwnership.THIRD_PARTY,
        displayName: input.displayName,
        phoneE164: input.phoneE164,
        active: false, // inactive until compliance accepts docs
        documents: input.licenceStorageKey
          ? {
              create: {
                docType: "driving_licence",
                storageKey: input.licenceStorageKey.startsWith("sandbox://")
                  ? input.licenceStorageKey
                  : `sandbox://${input.licenceStorageKey}`,
                expiresAt: input.licenceExpiresAt ? new Date(input.licenceExpiresAt) : null,
                reviewState: DocumentReviewState.SUBMITTED,
                draftLabel: DRAFT,
              },
            }
          : undefined,
      },
      include: { documents: true },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "providers.driver.onboard_stub",
        resource: "driver",
        resourceId: driver.id,
        metadata: { providerId: provider.id, licenceVerified: false },
      },
    });
    return {
      id: driver.id,
      displayName: driver.displayName,
      active: driver.active,
      message: "Driver stub created inactive — licence not verified",
      documents: driver.documents,
    };
  }

  /** Isolation: only own provider docs; foreign id returns 403/404. */
  async getDocument(user: RequestUser, documentId: string) {
    const doc = await this.prisma.providerDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException({ code: "NOT_FOUND", message: "Document not found" });
    await this.ownership.assertProviderAccess(user, doc.providerId);
    return this.publicDoc(doc);
  }

  async listComplianceQueue(statuses?: ProviderStatus[]) {
    await this.expireDocuments();
    const providers = await this.prisma.provider.findMany({
      where: statuses?.length ? { status: { in: statuses } } : undefined,
      include: {
        documents: true,
        _count: { select: { drivers: true, vehicles: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return {
      inventoryNote: "Compliance queue from DB — statuses are human-gated, never auto-approved",
      data: providers.map((p) => ({
        id: p.id,
        legalName: p.legalName,
        tradeName: p.tradeName,
        registrationNo: p.registrationNo,
        status: p.status,
        suspensionReason: p.suspensionReason,
        suspendedAt: p.suspendedAt?.toISOString() ?? null,
        notes: p.notes,
        documentCount: p.documents.length,
        expiredDocs: p.documents.filter((d) => d.reviewState === DocumentReviewState.EXPIRED)
          .length,
        driverCount: p._count.drivers,
        vehicleCount: p._count.vehicles,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async getComplianceDetail(providerId: string) {
    await this.expireDocuments(providerId);
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        documents: true,
        drivers: { include: { documents: true } },
        reviews: { orderBy: { createdAt: "desc" }, take: 50 },
        user: { select: { id: true, email: true } },
      },
    });
    if (!provider) throw new NotFoundException({ code: "NOT_FOUND", message: "Provider not found" });
    return {
      provider: {
        ...this.publicProvider(provider),
        suspensionReason: provider.suspensionReason,
        suspendedAt: provider.suspendedAt?.toISOString() ?? null,
        applicantEmail: provider.user?.email ?? null,
      },
      documents: provider.documents.map((d) => this.publicDoc(d)),
      drivers: provider.drivers.map((d) => ({
        id: d.id,
        displayName: d.displayName,
        active: d.active,
        documents: d.documents.map((doc) => ({
          id: doc.id,
          docType: doc.docType,
          reviewState: doc.reviewState,
          expiresAt: doc.expiresAt?.toISOString() ?? null,
          draftLabel: doc.draftLabel,
        })),
      })),
      reviews: provider.reviews,
      verificationNote: "Human verification required — no fabricated licence approval",
    };
  }

  async review(
    reviewer: RequestUser,
    providerId: string,
    input: { toStatus: ProviderStatus; note?: string; decision?: string },
  ) {
    if (
      !this.ownership.hasAnyRole(reviewer, [
        RoleCode.COMPLIANCE_OFFICER,
        RoleCode.SUPER_ADMIN,
      ])
    ) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Compliance role required" });
    }

    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException({ code: "NOT_FOUND", message: "Provider not found" });

    const allowed = ALLOWED_REVIEW[provider.status] ?? [];
    if (!allowed.includes(input.toStatus)) {
      throw new BadRequestException({
        code: "ILLEGAL_STATUS",
        message: `Cannot move ${provider.status} → ${input.toStatus}`,
      });
    }

    if (input.toStatus === ProviderStatus.APPROVED) {
      await this.expireDocuments(providerId);
      const blocking = await this.prisma.providerDocument.count({
        where: {
          providerId,
          OR: [
            { reviewState: DocumentReviewState.EXPIRED },
            { expiresAt: { lte: new Date() } },
          ],
        },
      });
      // Approval is still human; warn but allow if no docs yet with note — require note
      if (!input.note || input.note.trim().length < 8) {
        throw new BadRequestException({
          code: "REVIEW_NOTE_REQUIRED",
          message: "Approvals require an explicit human review note (evidence recorded)",
        });
      }
      if (blocking > 0) {
        throw new BadRequestException({
          code: "EXPIRED_DOCUMENTS",
          message: "Cannot approve while mandatory documents are expired",
        });
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.provider.update({
        where: { id: providerId },
        data: {
          status: input.toStatus,
          suspensionReason:
            input.toStatus === ProviderStatus.SUSPENDED
              ? input.note ?? "Suspended by compliance"
              : null,
          suspendedAt: input.toStatus === ProviderStatus.SUSPENDED ? new Date() : null,
          notes:
            input.toStatus === ProviderStatus.APPROVED
              ? `Human-approved by compliance — ${DRAFT}`
              : provider.notes,
        },
      });
      await tx.providerReview.create({
        data: {
          providerId,
          reviewerId: reviewer.id,
          fromStatus: provider.status,
          toStatus: input.toStatus,
          decision: input.decision ?? input.toStatus,
          note: input.note,
        },
      });

      // Promote applicant role to provider_admin only on APPROVED
      if (input.toStatus === ProviderStatus.APPROVED && provider.userId) {
        const adminRole = await tx.role.findUniqueOrThrow({
          where: { code: RoleCode.PROVIDER_ADMIN },
        });
        const existing = await tx.roleAssignment.findFirst({
          where: {
            userId: provider.userId,
            roleId: adminRole.id,
            revokedAt: null,
          },
        });
        if (!existing) {
          await tx.roleAssignment.create({
            data: {
              userId: provider.userId,
              roleId: adminRole.id,
              providerId,
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          actorId: reviewer.id,
          action: "admin.provider.review",
          resource: "provider",
          resourceId: providerId,
          metadata: {
            fromStatus: provider.status,
            toStatus: input.toStatus,
            autoApproved: false,
            humanVerified: true,
          },
        },
      });
      return next;
    });

    return {
      provider: this.publicProvider(updated),
      message:
        input.toStatus === ProviderStatus.APPROVED
          ? "Provider APPROVED by human compliance review — not an automated licence invent"
          : `Provider status set to ${input.toStatus}`,
    };
  }

  async suspend(reviewer: RequestUser, providerId: string, reason: string) {
    return this.review(reviewer, providerId, {
      toStatus: ProviderStatus.SUSPENDED,
      decision: "SUSPEND",
      note: reason,
    });
  }

  async expireDocuments(providerId?: string) {
    const now = new Date();
    const result = await this.prisma.providerDocument.updateMany({
      where: {
        ...(providerId ? { providerId } : {}),
        expiresAt: { lte: now },
        reviewState: { not: DocumentReviewState.EXPIRED },
      },
      data: { reviewState: DocumentReviewState.EXPIRED },
    });
    await this.prisma.driverDocument.updateMany({
      where: {
        ...(providerId
          ? { driver: { providerId } }
          : {}),
        expiresAt: { lte: now },
        reviewState: { not: DocumentReviewState.EXPIRED },
      },
      data: { reviewState: DocumentReviewState.EXPIRED },
    });
    return result.count;
  }

  private async requireOwnProvider(user: RequestUser) {
    if (!user.providerId) {
      const linked = await this.prisma.provider.findFirst({ where: { userId: user.id } });
      if (!linked) {
        throw new ForbiddenException({
          code: "NO_PROVIDER",
          message: "User is not linked to a provider",
        });
      }
      return linked;
    }
    const provider = await this.prisma.provider.findUnique({ where: { id: user.providerId } });
    if (!provider) throw new NotFoundException({ code: "NOT_FOUND", message: "Provider not found" });
    await this.ownership.assertProviderAccess(user, provider.id);
    return provider;
  }

  private publicProvider(p: {
    id: string;
    legalName: string;
    tradeName: string | null;
    registrationNo: string | null;
    status: ProviderStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: p.id,
      legalName: p.legalName,
      tradeName: p.tradeName,
      registrationNo: p.registrationNo,
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      verificationClaim: false as const,
    };
  }

  private publicDoc(d: {
    id: string;
    providerId: string;
    docType: string;
    storageKey: string;
    expiresAt: Date | null;
    reviewState: DocumentReviewState;
    draftLabel: string;
    createdAt: Date;
  }) {
    return {
      id: d.id,
      providerId: d.providerId,
      docType: d.docType,
      storageKey: d.storageKey,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      reviewState: d.reviewState,
      draftLabel: d.draftLabel,
      createdAt: d.createdAt.toISOString(),
      verifiedLicence: false as const,
    };
  }
}
