export interface LoginResponseDto {
  url: string;
}

export interface SessionResponseDto {
  authenticated: boolean;
  user?: {
    battletag?: string;
  };
}

export interface CallbackQueryDto {
  code?: string;
  state?: string;
  error?: string;
}
