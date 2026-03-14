import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import type { RequestHandler } from 'express';

// Security headers (protects from XSS, clickjacking, MIME sniffing, etc.)
export const securityHeaders = helmet();

// CORS — allow frontend dev server and same-origin production
export const corsMiddleware = cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Same-origin
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
});

// Rate limiting — protects from DDoS, bots, and request flooding
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter rate limit for calculation endpoints
export const calculationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1-minute window
  max: 30,             // 30 calculation requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Calculation rate limit exceeded. Please wait before trying again.' },
});

// Request logging
export const requestLogger: RequestHandler = morgan('short');
