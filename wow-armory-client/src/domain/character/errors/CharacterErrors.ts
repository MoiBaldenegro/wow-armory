export class CharacterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CharacterNotFound extends CharacterError {
  constructor(message = 'Character not found.') {
    super(message);
  }
}

export class CharacterRateLimited extends CharacterError {
  readonly retryAfterSeconds?: number;

  constructor(retryAfterSeconds?: number) {
    super('Character lookup rate limit exceeded.');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class CharacterUnavailable extends CharacterError {
  constructor(message = 'Character data is temporarily unavailable.') {
    super(message);
  }
}

export class CharacterValidation extends CharacterError {
  constructor(message = 'Invalid character lookup parameters.') {
    super(message);
  }
}
