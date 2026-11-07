export class CharacterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidRealmSlug extends CharacterError {
  constructor() {
    super('The realm slug is invalid.');
  }
}

export class InvalidCharacterName extends CharacterError {
  constructor() {
    super('The character name is invalid.');
  }
}

export class CharacterNotFound extends CharacterError {
  constructor() {
    super('The requested character was not found.');
  }
}

export class BlizzardUnavailable extends CharacterError {
  constructor() {
    super('The character service is temporarily unavailable.');
  }
}

export class BlizzardRateLimited extends CharacterError {
  constructor(public readonly retryAfterSeconds?: number) {
    super('The character service rate limit was exceeded.');
  }
}
