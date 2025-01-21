import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

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
  const port = process.env.PORT || 3000; // Usa una variable de entorno para el puerto si está definida
  await app.listen(port);
  console.log(`Servidor escuchando en http://localhost:${port}`);
}

bootstrap();