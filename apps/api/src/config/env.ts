import { config as dotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv({ path: resolve(process.cwd(), "../../.env") });
dotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_ORIGIN: z.string().default("http://localhost:3001"),
  API_PORT: z.coerce.number().default(4000),
  PAYMENT_PROVIDER: z.string().default("sandbox"),
  SMS_PROVIDER: z.string().default("sandbox"),
  EMAIL_PROVIDER: z.string().default("sandbox"),
  PAYMENT_WEBHOOK_SECRET: z.string().default("dev-webhook-secret"),
  WORKER_SECRET: z.string().default("dev-worker-secret"),
  GO_LIVE_LOCKED: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  ALLOW_LIVE_PAYMENTS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  ALLOW_LIVE_PROVIDERS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  AUTH_RATE_LIMIT: z.coerce.number().optional(),
  AUTH_RATE_WINDOW_SEC: z.coerce.number().default(60),
});

export type Env = z.infer<typeof envSchema> & {
  AUTH_RATE_LIMIT: number;
};

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const data = parsed.data;
  // Tests share one IP across many suites — ignore tight .env limits so OTP/MFA coverage does not trip CI.
  const authLimit =
    data.NODE_ENV === "test"
      ? Math.max(data.AUTH_RATE_LIMIT ?? 500, 500)
      : (data.AUTH_RATE_LIMIT ?? 30);
  cached = { ...data, AUTH_RATE_LIMIT: authLimit };
  return cached;
}

/** Test helper — clear cached env after mutating process.env. */
export function resetEnvCache() {
  cached = null;
}
