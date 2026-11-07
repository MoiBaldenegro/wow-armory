import { Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { CheckSession } from '../application/CheckSession';
import { CompleteLogin, LoginErrorCode } from '../application/CompleteLogin';
import { Logout } from '../application/Logout';
import { StartLogin } from '../application/StartLogin';
import { SESSION_COOKIE_NAME } from '../../shared/infrastructure/session.constants';
import {
  CallbackQueryDto,
  LoginResponseDto,
  SessionResponseDto,
} from './dto/auth.dto';

const DEFAULT_CLIENT_URL = 'http://localhost:5173';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly startLogin: StartLogin,
    private readonly completeLogin: CompleteLogin,
    private readonly checkSession: CheckSession,
    private readonly logoutUseCase: Logout,
    private readonly config: ConfigService,
  ) {}

  @Get('login')
  async login(): Promise<LoginResponseDto> {
    return this.startLogin.execute();
  }

  @Get('callback')
  async callback(
    @Query() query: CallbackQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.completeLogin.execute(query);

    if (!result.ok) {
      response.redirect(this.buildClientUrl(result.error));
      return;
    }

    response.redirect(this.buildClientUrl());
  }

  @Get('session')
  async session(): Promise<SessionResponseDto> {
    return this.checkSession.execute();
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Res({ passthrough: true }) response: Response): Promise<void> {
    await this.logoutUseCase.execute();

    const cookieOptions: CookieOptions = {
      path: '/',
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      sameSite: this.config.get<'lax' | 'strict' | 'none'>(
        'COOKIE_SAME_SITE',
        'lax',
      ),
    };

    const domain = this.config.get<string>('COOKIE_DOMAIN');

    if (domain) {
      cookieOptions.domain = domain;
    }

    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  }

  private buildClientUrl(authError?: LoginErrorCode): string {
    const clientUrl =
      this.config.get<string>('CLIENT_URL') ?? DEFAULT_CLIENT_URL;

    if (!authError) {
      return clientUrl;
    }

    const separator = clientUrl.includes('?') ? '&' : '?';
    return `${clientUrl}${separator}auth_error=${encodeURIComponent(authError)}`;
  }
}
