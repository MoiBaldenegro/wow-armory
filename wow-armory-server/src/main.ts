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

  // Inicia la aplicación
  const port = process.env.PORT || 3000; // Usa una variable de entorno para el puerto si está definida
  await app.listen(port);
  console.log(`Servidor escuchando en http://localhost:${port}`);
}

bootstrap();
