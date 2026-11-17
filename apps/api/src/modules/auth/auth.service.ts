import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { RoleCode, type LoginInput, type RegisterInput } from "@haramain/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { loadEnv } from "../../config/env";
import type { JwtAccessPayload, RequestUser } from "./auth.types";

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

    const { session, refreshToken } = await this.issueSession(user.id, meta);
    const requestUser = await this.toRequestUser(user.id, session.id);
    const accessToken = this.signAccess({ ...requestUser, sessionId: session.id });

    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        action: "auth.login",
        resource: "session",
        resourceId: session.id,
        metadata: { roles: requestUser.roles },
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: loadEnv().JWT_ACCESS_TTL,
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
    return this.toRequestUser(userId);
  }
}
