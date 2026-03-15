import { Router, Request, Response } from 'express';
import {
  parseInput,
  calculatePackageCost,
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

    const { baseCost, packages } = parseInput(input, 'cost');
    const results = packages.map(pkg => {
      const { discount, totalCost } = calculatePackageCost(pkg, baseCost);
      return { id: pkg.id, discount: Math.round(discount), cost: Math.round(totalCost) };
    });

    res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});
