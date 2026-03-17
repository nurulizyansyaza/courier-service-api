import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import type { RequestHandler } from 'express';
import {
  ALLOWED_ORIGINS,
  API_RATE_LIMIT_WINDOW_MS,
  API_RATE_LIMIT_MAX,
  CALC_RATE_LIMIT_WINDOW_MS,
  CALC_RATE_LIMIT_MAX,
} from '../config';

// Security headers (protects from XSS, clickjacking, MIME sniffing, etc.)
export const securityHeaders = helmet();

// CORS — allow frontend dev server, same-origin, and configured CloudFront distribution
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
});

// Rate limiting — protects from DDoS, bots, and request flooding
export const apiRateLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter rate limit for calculation endpoints
export const calculationRateLimiter = rateLimit({
  windowMs: CALC_RATE_LIMIT_WINDOW_MS,
  max: CALC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Calculation rate limit exceeded. Please wait before trying again.' },
});

// Request logging
export const requestLogger: RequestHandler = morgan('short');
