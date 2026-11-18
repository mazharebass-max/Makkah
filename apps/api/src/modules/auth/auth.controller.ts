import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  MfaLoginVerifyDto,
  MfaTotpCodeDto,
  OtpRequestDto,
  OtpVerifyDto,
  RefreshDto,
  RegisterDto,
} from "./auth.dto";
import { AuthGuard, type AuthedRequest } from "./auth.guard";
import { loadEnv } from "../../config/env";
import { RateLimitService } from "../../common/rate-limit.service";
import { NotificationsService } from "../notifications/notifications.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private async limitAuth(req: Request, action: string) {
    const env = loadEnv();
    const ip = req.ip || "unknown";
    await this.rateLimit.consume(
      `auth:${action}:${ip}`,
      env.AUTH_RATE_LIMIT,
      env.AUTH_RATE_WINDOW_SEC,
    );
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = loadEnv().NODE_ENV === "production";
    res.cookie("hr_access", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("hr_refresh", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post("register")
  async register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.limitAuth(req, "register");
    const result = await this.auth.register(
      { ...body, locale: body.locale ?? "en" },
      {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
    );
    if ("accessToken" in result && result.accessToken) {
      this.setCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.limitAuth(req, "login");
    const result = await this.auth.login(body, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    if ("accessToken" in result && result.accessToken) {
      this.setCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @Post("refresh")
  async refresh(@Body() body: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(body.refreshToken);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @UseGuards(AuthGuard)
  @Post("logout")
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user?.sessionId, req.user!.id);
    res.clearCookie("hr_access");
    res.clearCookie("hr_refresh");
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get("me")
  async me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user!.id);
  }

  /** Sandbox email OTP request — debugCode only in development/test. */
  @Post("otp/request")
  async requestOtp(@Req() req: Request, @Body() body: OtpRequestDto) {
    const env = loadEnv();
    await this.rateLimit.consume(
      `otp:${req.ip || "unknown"}:${body.email}`,
      Math.min(env.AUTH_RATE_LIMIT, 10),
      env.AUTH_RATE_WINDOW_SEC,
    );
    const queued = await this.auth.requestEmailOtp(body.email);
    // Lazy resolve avoids AuthModule ↔ NotificationsModule import cycle
    let processed: unknown = null;
    try {
      const notifications = this.moduleRef.get(NotificationsService, { strict: false });
      processed = await notifications.processOutbox(10);
    } catch {
      processed = { skipped: true, reason: "notifications_unavailable" };
    }
    return { ...queued, processed };
  }

  @Post("otp/verify")
  async verifyOtp(@Req() req: Request, @Body() body: OtpVerifyDto) {
    const env = loadEnv();
    await this.rateLimit.consume(
      `otp-verify:${req.ip || "unknown"}:${body.email}`,
      Math.min(env.AUTH_RATE_LIMIT, 10),
      env.AUTH_RATE_WINDOW_SEC,
    );
    return this.auth.verifyEmailOtp(body.email, body.code);
  }

  /** Admin TOTP enroll — staff roles only; scaffold, not a go-live claim. */
  @UseGuards(AuthGuard)
  @Post("mfa/totp/enroll")
  enrollMfa(@Req() req: AuthedRequest) {
    return this.auth.enrollTotp(req.user!);
  }

  @UseGuards(AuthGuard)
  @Post("mfa/totp/confirm")
  confirmMfa(@Req() req: AuthedRequest, @Body() body: MfaTotpCodeDto) {
    return this.auth.confirmTotp(req.user!, body.code);
  }

  @Post("mfa/totp/verify")
  async verifyMfaLogin(
    @Body() body: MfaLoginVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.limitAuth(req, "mfa-verify");
    const result = await this.auth.verifyTotpLogin(body.mfaToken, body.code, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    if (result.accessToken) {
      this.setCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }
}
