import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, {
    cors: false,
    rawBody: true,
  });
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  const corsOrigins = new Set([
    env.WEB_ORIGIN,
    env.ADMIN_ORIGIN,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ]);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.has(origin) || env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const appEnv = process.env.APP_ENV ?? env.NODE_ENV;
  const swaggerAllowed = env.NODE_ENV !== "production" && appEnv !== "staging";
  if (swaggerAllowed) {
    const config = new DocumentBuilder()
      .setTitle("Haramain Ride API")
      .setDescription(
        "Modular monolith — sandbox adapters only until compliance gate sign-off. Not live ops.",
      )
      .setVersion("0.8.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
  }

  if (env.ALLOW_LIVE_PAYMENTS || env.ALLOW_LIVE_PROVIDERS) {
    // eslint-disable-next-line no-console
    console.warn(
      "[haramain] ALLOW_LIVE_* flags set — compliance gate still unsigned; do not claim go-live",
    );
  }

  await app.listen(env.API_PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(
    `API listening on http://localhost:${env.API_PORT}/api/v1 (appEnv=${appEnv}, liveOps=false)`,
  );
}

bootstrap();
