import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, RegisterDto } from "./auth.dto";
import { AuthGuard, type AuthedRequest } from "./auth.guard";
import { loadEnv } from "../../config/env";
import { RateLimitService } from "../../common/rate-limit.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
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
    this.setCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.limitAuth(req, "login");
    const result = await this.auth.login(body, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    this.setCookies(res, result.accessToken, result.refreshToken);
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
}
