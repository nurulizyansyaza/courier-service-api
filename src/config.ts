// ── Server Configuration ─────────────────────────────────────────────

export const PORT = process.env.PORT || 3000;

// ── Rate Limiting ────────────────────────────────────────────────────

/** Global API rate limit: requests per window per IP */
export const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const API_RATE_LIMIT_MAX = 100;

/** Stricter rate limit for calculation endpoints */
export const CALC_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const CALC_RATE_LIMIT_MAX = 30;

// ── CORS ─────────────────────────────────────────────────────────────

const devOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Same-origin
];

export const ALLOWED_ORIGINS = process.env.PRODUCTION_DOMAIN
  ? [...devOrigins, `https://${process.env.PRODUCTION_DOMAIN}`]
  : devOrigins;

// ── Body Parser ──────────────────────────────────────────────────────

export const MAX_BODY_SIZE = '10kb';

// ── Validation ───────────────────────────────────────────────────────

export const MAX_INPUT_LENGTH = 5000;
