process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'e2e-session-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'warn';
// High limits so only the dedicated rate limit suites ever hit a 429.
process.env.RATE_LIMIT_AUTH_LIMIT = '10000';
process.env.RATE_LIMIT_PUBLIC_LIMIT = '10000';
