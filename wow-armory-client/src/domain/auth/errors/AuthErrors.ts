export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthUnavailable extends AuthError {
  constructor(message = 'Authentication is temporarily unavailable.') {
    super(message);
  }
}

export class AuthInvalidResponse extends AuthError {
  constructor(message = 'Authentication response is invalid.') {
    super(message);
  }
}
