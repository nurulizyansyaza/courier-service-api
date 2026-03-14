import express from 'express';
import { costRouter } from './routes/cost';
import { deliveryRouter } from './routes/delivery';
import {
  securityHeaders,
  corsMiddleware,
  apiRateLimiter,
  requestLogger,
} from './middleware/security';

export const app = express();

// ── Security Middleware ──────────────────────────────────────────────
app.use(securityHeaders);        // Helmet: security headers (XSS, clickjacking, MIME sniffing)
app.use(corsMiddleware);         // CORS: restrict cross-origin access
app.use(apiRateLimiter);         // Rate limiting: protect from DDoS / request flooding
app.use(requestLogger);          // Morgan: request logging / audit trail
app.use(express.json({ limit: '10kb' })); // Body parser with size limit

// ── Routes ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/cost', costRouter);
app.use('/api/delivery', deliveryRouter);
