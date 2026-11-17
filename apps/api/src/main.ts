import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { cors: false });
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

  if (env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Haramain Ride API")
      .setDescription("Production modular monolith — sandbox adapters in M1")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.API_PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.API_PORT}/api/v1`);
}

bootstrap();
