import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as dotenv from 'dotenv';

// Extender la interfaz de Express.Session
declare module 'express-session' {
  interface SessionData {
    oauth_state: string;
    access_token: string;
  }
}

// Carga las variables de entorno antes de cualquier otra cosa
dotenv.config();

async function bootstrap() {
  // Verifica que las variables de entorno críticas están presentes
  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    throw new Error(
      'Faltan variables de entorno críticas: BLIZZARD_CLIENT_ID o BLIZZARD_CLIENT_SECRET',
    );
  }

  const app = await NestFactory.create(AppModule);

  // Habilitar middleware de cookies
  app.use(cookieParser());

  // Configurar sesiones
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'mi-secreto-temporal', // Usa una variable de entorno en producción
      resave: false,
      saveUninitialized: false,
      name: 'wow_session',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        sameSite: 'lax'
      }
    })
  );

  // Middleware personalizado para agregar cabeceras CORS si enableCors no es suficiente
  app.use((req, res, next) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://wow-armory.pages.dev',
    ];
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });

  app.enableCors({
    origin: ['http://localhost:5173', 'https://wow-armory.pages.dev'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Permitir credenciales (cookies, Authorization headers, etc.)
  });

  // Inicia la aplicación
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Servidor escuchando en http://localhost:${port}`);
}

bootstrap();