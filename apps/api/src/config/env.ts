import { config as dotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv({ path: resolve(process.cwd(), "../../.env") });
dotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
