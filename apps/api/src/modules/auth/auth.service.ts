import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { createHash, randomInt, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { OtpPurpose, Prisma } from "@prisma/client";
import { RoleCode, type LoginInput, type RegisterInput } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { loadEnv } from "../../config/env";
import type { JwtAccessPayload, JwtMfaPendingPayload, RequestUser } from "./auth.types";
import { ADMIN_MFA_ROLES, allowOtpDebugCode, hashOtpCode, otpCodesEqual } from "./otp.util";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "./totp";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseDurationMs(input: string): number {
  const m = /^(\d+)([smhd])$/.exec(input);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private signAccess(user: RequestUser & { sessionId: string }) {
    const env = loadEnv();
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sid: user.sessionId,
      typ: "access",
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
    });
  }

  private async issueSession(userId: string, meta?: { userAgent?: string; ip?: string }) {
    const env = loadEnv();
    const refreshToken = randomUUID() + "." + randomUUID();
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt,
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });
    return { session, refreshToken };
  }

  private async toRequestUser(userId: string, sessionId?: string): Promise<RequestUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          include: { role: true },
        },
        provider: true,
      },
    });
    return {
      id: user.id,
      email: user.email,
      locale: user.locale,
      roles: user.roleAssignments.map((a) => a.role.code as RoleCode),
      providerId: user.provider?.id ?? null,
      sessionId,
    };
  }

  async register(input: RegisterInput, meta?: { userAgent?: string; ip?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException({ code: "EMAIL_EXISTS", message: "Email already registered" });
    }
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { code: RoleCode.CUSTOMER } });

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        locale: input.locale ?? "en",
        identities: { create: { provider: "email", subject: input.email.toLowerCase(), verifiedAt: new Date() } },
        customerProfile: { create: { displayName: input.displayName ?? null } },
        roleAssignments: { create: { roleId: customerRole.id } },
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "auth.register",
        resource: "user",
        resourceId: user.id,
      },
    });

    return this.login({ email: input.email, password: input.password }, meta);
  }

  async login(input: LoginInput, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid credentials" });
    }
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Invalid credentials" });
    }

    const requestUserPreview = await this.toRequestUser(user.id);
    const isAdminRole = requestUserPreview.roles.some((r) => ADMIN_MFA_ROLES.has(r));
    if (user.mfaEnabledAt && user.mfaTotpSecret && isAdminRole) {
      const env = loadEnv();
      const mfaToken = jwt.sign(
        { sub: user.id, email: user.email, typ: "mfa_pending" } satisfies JwtMfaPendingPayload,
        env.JWT_ACCESS_SECRET,
        { expiresIn: "5m" },
      );
      await this.prisma.auditEvent.create({
        data: {
          actorId: user.id,
          action: "auth.login.mfa_required",
          resource: "user",
          resourceId: user.id,
          metadata: { mfaRequired: true },
        },
      });
      return {
        mfaRequired: true as const,
        mfaToken,
        message: "Admin MFA required — submit TOTP via POST /auth/mfa/totp/verify",
        liveOps: false as const,
        user: {
          id: requestUserPreview.id,
          email: requestUserPreview.email,
          roles: requestUserPreview.roles,
          locale: requestUserPreview.locale,
        },
      };
    }

    return this.completeLogin(user.id, meta);
  }

  private async completeLogin(userId: string, meta?: { userAgent?: string; ip?: string }) {
    const { session, refreshToken } = await this.issueSession(userId, meta);
    const requestUser = await this.toRequestUser(userId, session.id);
    const accessToken = this.signAccess({ ...requestUser, sessionId: session.id });

    await this.prisma.auditEvent.create({
      data: {
        actorId: userId,
        action: "auth.login",
        resource: "session",
        resourceId: session.id,
        metadata: { roles: requestUser.roles },
      },
    });

    return {
      mfaRequired: false as const,
      accessToken,
      refreshToken,
      expiresIn: loadEnv().JWT_ACCESS_TTL,
      liveOps: false as const,
      user: {
        id: requestUser.id,
        email: requestUser.email,
        roles: requestUser.roles,
        locale: requestUser.locale,
      },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException({ code: "INVALID_REFRESH", message: "Refresh token invalid" });
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { session: next, refreshToken: nextRefresh } = await this.issueSession(session.userId, {
      userAgent: session.userAgent ?? undefined,
      ip: session.ip ?? undefined,
    });
    const requestUser = await this.toRequestUser(session.userId, next.id);
    const accessToken = this.signAccess({ ...requestUser, sessionId: next.id });
    return {
      accessToken,
      refreshToken: nextRefresh,
      expiresIn: loadEnv().JWT_ACCESS_TTL,
      user: {
        id: requestUser.id,
        email: requestUser.email,
        roles: requestUser.roles,
        locale: requestUser.locale,
      },
    };
  }

  async logout(sessionId: string | undefined, userId: string) {
    if (!sessionId) return { ok: true };
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async verifyAccessToken(token: string): Promise<RequestUser> {
    const env = loadEnv();
    let payload: JwtAccessPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    } catch {
      throw new UnauthorizedException({ code: "INVALID_TOKEN", message: "Access token invalid" });
    }
    if (payload.typ !== "access") {
      throw new UnauthorizedException({ code: "INVALID_TOKEN", message: "Access token invalid" });
    }
    const session = await this.prisma.session.findFirst({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      throw new UnauthorizedException({ code: "SESSION_REVOKED", message: "Session revoked" });
    }
    return this.toRequestUser(payload.sub, session.id);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const base = await this.toRequestUser(userId);
    return {
      ...base,
      mfaEnabled: Boolean(user.mfaEnabledAt),
      emailVerified: await this.isEmailVerified(userId, user.email),
    };
  }

  private async isEmailVerified(userId: string, email: string) {
    const identity = await this.prisma.userIdentity.findFirst({
      where: { userId, provider: "email", subject: email.toLowerCase() },
    });
    return Boolean(identity?.verifiedAt);
  }

  /**
   * Request email OTP (sandbox delivery via outbox). Stores hashed challenge.
   * debugCode only returned in development/test — never staging/production.
   */
  async requestEmailOtp(emailRaw: string) {
    const env = loadEnv();
    const email = emailRaw.toLowerCase();
    const code = String(randomInt(100000, 999999));
    const user = await this.prisma.user.findUnique({ where: { email } });

    await this.prisma.otpChallenge.updateMany({
      where: { email, purpose: OtpPurpose.EMAIL_VERIFY, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.otpChallenge.create({
      data: {
        email,
        userId: user?.id ?? null,
        purpose: OtpPurpose.EMAIL_VERIFY,
        codeHash: hashOtpCode(code),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    // Outbox row — drained by NotificationsService.processOutbox / worker (sandbox only)
    await this.prisma.outboxEvent.create({
      data: {
        type: "notification.otp",
        payload: {
          userId: user?.id,
          toEmail: email,
          templateCode: "otp_email",
          vars: { code },
          dedupeKey: `otp:${email}:${code}`,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: user?.id ?? null,
        action: "auth.otp.request",
        resource: "otp_challenge",
        metadata: { email, liveDelivery: false, debugExposed: allowOtpDebugCode(env) },
      },
    });

    return {
      mode: "sandbox" as const,
      message: "OTP queued to outbox — sandbox channel only, not a live delivery",
      liveDelivery: false as const,
      ...(allowOtpDebugCode(env) ? { debugCode: code } : {}),
    };
  }

  /** Verify email OTP and mark email identity verified when user exists. */
  async verifyEmailOtp(emailRaw: string, code: string) {
    const email = emailRaw.toLowerCase();
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: OtpPurpose.EMAIL_VERIFY,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) {
      throw new UnauthorizedException({
        code: "OTP_INVALID",
        message: "OTP expired or not found",
      });
    }
    if (challenge.attempts >= 5) {
      throw new UnauthorizedException({
        code: "OTP_LOCKED",
        message: "Too many OTP attempts",
      });
    }

    const match = otpCodesEqual(challenge.codeHash, code);
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: { increment: 1 },
        ...(match ? { consumedAt: new Date() } : {}),
      },
    });
    if (!match) {
      throw new UnauthorizedException({ code: "OTP_INVALID", message: "Invalid OTP code" });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      await this.prisma.userIdentity.upsert({
        where: { provider_subject: { provider: "email", subject: email } },
        update: { verifiedAt: new Date(), userId: user.id },
        create: {
          userId: user.id,
          provider: "email",
          subject: email,
          verifiedAt: new Date(),
        },
      });
      await this.prisma.auditEvent.create({
        data: {
          actorId: user.id,
          action: "auth.otp.verify",
          resource: "user_identity",
          resourceId: user.id,
          metadata: { email },
        },
      });
    }

    return {
      ok: true as const,
      email,
      verified: true as const,
      userId: user?.id ?? null,
      message: "Email OTP verified (sandbox path — not a live SMS/email claim)",
      liveDelivery: false as const,
    };
  }

  assertAdminMfaRole(user: RequestUser) {
    if (!user.roles.some((r) => ADMIN_MFA_ROLES.has(r))) {
      throw new ForbiddenException({
        code: "MFA_ROLE_REQUIRED",
        message: "TOTP MFA enroll/confirm is limited to admin/staff roles",
      });
    }
  }

  /** Begin TOTP enrollment — secret stored; MFA not active until confirm. */
  async enrollTotp(user: RequestUser) {
    this.assertAdminMfaRole(user);
    const existing = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (existing.mfaEnabledAt) {
      throw new ConflictException({
        code: "MFA_ALREADY_ENABLED",
        message: "MFA already enabled for this account",
      });
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaTotpSecret: secret, mfaEnabledAt: null },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "auth.mfa.enroll",
        resource: "user",
        resourceId: user.id,
        metadata: { scaffold: true, liveOps: false },
      },
    });
    return {
      mode: "scaffold" as const,
      liveOps: false as const,
      message:
        "TOTP secret issued for authenticator enrollment — confirm with a code. Scaffold only; not a production MFA mandate claim.",
      secret,
      otpauthUrl: otpauthUrl({ secret, email: user.email }),
    };
  }

  async confirmTotp(user: RequestUser, code: string) {
    this.assertAdminMfaRole(user);
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!row.mfaTotpSecret) {
      throw new BadRequestException({
        code: "MFA_NOT_ENROLLED",
        message: "Call enroll before confirm",
      });
    }
    if (!verifyTotp(row.mfaTotpSecret, code)) {
      throw new UnauthorizedException({ code: "MFA_INVALID", message: "Invalid TOTP code" });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabledAt: new Date() },
    });
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "auth.mfa.confirm",
        resource: "user",
        resourceId: user.id,
        metadata: { scaffold: true },
      },
    });
    return {
      ok: true as const,
      mfaEnabled: true as const,
      mode: "scaffold" as const,
      liveOps: false as const,
      message: "Admin TOTP MFA enabled (scaffold). productionGoLive remains false.",
    };
  }

  async verifyTotpLogin(
    mfaToken: string,
    code: string,
    meta?: { userAgent?: string; ip?: string },
  ) {
    const env = loadEnv();
    let payload: JwtMfaPendingPayload;
    try {
      payload = jwt.verify(mfaToken, env.JWT_ACCESS_SECRET) as JwtMfaPendingPayload;
    } catch {
      throw new UnauthorizedException({
        code: "MFA_TOKEN_INVALID",
        message: "MFA pending token invalid or expired",
      });
    }
    if (payload.typ !== "mfa_pending") {
      throw new UnauthorizedException({
        code: "MFA_TOKEN_INVALID",
        message: "MFA pending token invalid",
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mfaTotpSecret || !user.mfaEnabledAt) {
      throw new UnauthorizedException({
        code: "MFA_NOT_ENABLED",
        message: "MFA is not enabled for user",
      });
    }
    if (!verifyTotp(user.mfaTotpSecret, code)) {
      throw new UnauthorizedException({ code: "MFA_INVALID", message: "Invalid TOTP code" });
    }
    return this.completeLogin(user.id, meta);
  }
}
