import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const allowedOrigins = configService.get<string[]>('app.allowedOrigins') || [];

  // Security
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like native mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*') ||
        nodeEnv !== 'production' || // Allow all in development/testing mode
        origin.endsWith('.onrender.com'); // Allow all Render subdomains (backend docs and frontends)
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Compression
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Real Estate AI Platform API')
      .setDescription('The Real Estate AI Platform API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  Logger.log(`Application running on port ${port} in ${nodeEnv} mode`, 'Bootstrap');
}
bootstrap();
