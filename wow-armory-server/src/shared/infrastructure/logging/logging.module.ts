import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogFormat, LogLevelName } from '../../../config/env.validation';
import { AppLogger } from './app-logger';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AppLogger,
      useFactory: (config: ConfigService) =>
        new AppLogger({
          format: config.get<LogFormat>('LOG_FORMAT', 'pretty'),
          level: config.get<LogLevelName>('LOG_LEVEL', 'log'),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [AppLogger],
})
export class LoggingModule {}
