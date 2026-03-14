import { Router, Request, Response } from 'express';
import {
  parseInputBlock,
  estimateCost,
  DEFAULT_CALC_OFFERS,
  toOfferArray,
} from '@nurulizyansyaza/courier-service-core';
import { validate, costSchema } from '../middleware/validation';
import { calculationRateLimiter } from '../middleware/security';

export const costRouter = Router();

/**
 * POST /api/cost
 * Body: { input: string } — multiline text (same format as CLI)
 * Returns: { results: [{ id, discount, cost }] }
 */
costRouter.post('/', calculationRateLimiter, validate(costSchema), (req: Request, res: Response) => {
  try {
    const { input } = req.body;

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
