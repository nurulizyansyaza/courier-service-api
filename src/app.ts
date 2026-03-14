import express from 'express';
import { costRouter } from './routes/cost';
import { deliveryRouter } from './routes/delivery';

export const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/cost', costRouter);
app.use('/api/delivery', deliveryRouter);
