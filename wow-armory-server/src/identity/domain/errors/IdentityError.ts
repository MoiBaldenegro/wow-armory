export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidOAuthStateError extends IdentityError {
  constructor() {
    super('The OAuth state is invalid or has already been used.');
  }
}

export class InvalidSessionError extends IdentityError {
  constructor(message = 'The authentication session is invalid.') {
    super(message);
  }
}

export class TokenExchangeError extends IdentityError {
  constructor() {
    super('The authorization code could not be exchanged for tokens.');
  }
}

export class TokenRefreshError extends IdentityError {
  constructor() {
    super('The access token could not be refreshed.');
  }
}
