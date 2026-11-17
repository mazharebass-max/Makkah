import type { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/** Lightweight ASVS-inspired headers — not a substitute for full pen test / WAF. */
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(self), payment=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
    );
    res.setHeader("X-Haramain-Live-Ops", "false");
    next();
  }
}
