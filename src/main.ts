import 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express'; // Using Express platform

// Ensure crypto is available
import { randomUUID } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID,
    // Add other crypto methods if needed
  } as any;
}

async function bootstrap() {
  // Use Express adapter for NestJS
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(), // No logger option here, configure Express logger separately if needed
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL, // Use environment variable
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Access port from environment variables (loaded by NestJS config/env module)
  const port = process.env.PORT || 3001;

  await app.listen(port, '0.0.0.0'); // Listen on all interfaces
  console.log(`NestJS auction backend listening on port ${port}`);
}
bootstrap();
