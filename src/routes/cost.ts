import { Router, Request, Response } from 'express';
import {
  parseInputBlock,
  estimateCost,
  DEFAULT_CALC_OFFERS,
  toOfferArray,
} from '@nurulizyansyaza/courier-service-core';

export const costRouter = Router();

/**
 * POST /api/cost
 * Body: { input: string } — multiline text (same format as CLI)
 * Returns: { results: [{ id, discount, cost }] }
 */
costRouter.post('/', (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "input" field' });
      return;
    }

    const { baseCost, packages } = parseInputBlock(input, 'cost');
    const results = estimateCost(baseCost, packages, toOfferArray(DEFAULT_CALC_OFFERS));

    res.json({
      results: results.map(r => ({
        id: r.id,
        discount: r.discount,
        cost: r.cost,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});
