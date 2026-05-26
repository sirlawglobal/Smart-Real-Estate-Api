import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const allowedOrigins = configService.get<string[]>('app.allowedOrigins') || [];

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        nodeEnv !== 'production' || // Allow all origins in non-production environments
        origin.endsWith('.onrender.com'); // Trust all Render-hosted subdomains

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // ── Performance ───────────────────────────────────────────────────────────
  app.use(compression());

  // Fix #12: 30-second hard timeout — prevents slow DB queries / third-party
  // API calls (Gemini, OpenAI) from hanging requests indefinitely.
  app.use((_req: any, res: any, next: () => void) => {
    res.setTimeout(30_000, () => {
      if (!res.headersSent) {
        res.status(408).json({ statusCode: 408, message: 'Request Timeout' });
      }
    });
    next();
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ───────────────────────────────────────────────────────────────
  // Fix #1: Always register Swagger regardless of NODE_ENV.
  // Previously gated behind `nodeEnv !== 'production'`, which would silently
  // remove live docs if NODE_ENV=production was ever set on Render.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Real Estate AI Platform API')
    .setDescription(
      'AI-Powered Real Estate Platform — REST API reference. ' +
      'Authenticate via Bearer token (JWT) returned from POST /auth/login.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port);
  Logger.log(`Application running on port ${port} in ${nodeEnv} mode`, 'Bootstrap');
  Logger.log(
    `Swagger docs: http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

bootstrap();
