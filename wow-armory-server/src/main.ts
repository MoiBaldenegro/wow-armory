import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

// Extender la interfaz de Express.Session
declare module 'express-session' {
  interface SessionData {
    oauth_state: string;
    access_token: string;
  }
}

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'tu-secreto-temporal',
      resave: false,
      saveUninitialized: false,
      name: 'wow_session',
      cookie: {
        secure: process.env.NODE_ENV === 'production', // Solo en producción debe ser `true`
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 día de duración de la cookie
        sameSite: 'none', // Necesario para cookies cross-site
        domain:
          process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined, // Ajuste para producción
      },
    }),
  );

  app.use(cookieParser());

  // Configura CORS para permitir cookies
  app.enableCors({
    origin: ['https://wow-armory.pages.dev', 'http://localhost:5173'],
    credentials: true, // Permite el uso de cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap();
