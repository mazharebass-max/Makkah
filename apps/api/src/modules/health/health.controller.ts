import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { loadEnv } from "../../config/env";

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Liveness — process is up (no dependency claims). */
  @Get("health")
  async health() {
    return {
      status: "ok",
      service: "haramain-api",
      liveOps: false,
      time: new Date().toISOString(),
    };
  }

  /** Readiness — DB required; sandbox flags echoed for staging probes. */
  @Get("health/ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        code: "DB_UNAVAILABLE",
        liveOps: false,
      });
    }
    const env = loadEnv();
    return {
      status: "ready",
      service: "haramain-api",
      database: "ok",
      paymentProvider: env.PAYMENT_PROVIDER,
      liveOps: false,
      productionGoLive: false,
      time: new Date().toISOString(),
    };
  }
}
