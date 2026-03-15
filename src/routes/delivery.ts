import { Router, Request, Response } from 'express';
import {
  parseInput,
  computeDeliveryResultsFromParsed,
  calculateDeliveryTimeWithTransit,
  TransitPackageInput,
} from '@nurulizyansyaza/courier-service-core';
import { validate, deliverySchema, transitSchema } from '../middleware/validation';
import { calculationRateLimiter } from '../middleware/security';

export const deliveryRouter = Router();

/**
 * POST /api/delivery
 * Body: { input: string }
 * Returns: { results: DetailedDeliveryResult[] }
 *
 * Breaking change: the `detailed` toggle and the old `{ cost, time }` response
 * shape have been removed.  The endpoint now always returns the detailed result
 * format from `computeDeliveryResultsFromParsed`.
 */
deliveryRouter.post('/', calculationRateLimiter, validate(deliverySchema), (req: Request, res: Response) => {
  try {
    const { input } = req.body;

    const { baseCost, packages, vehicles } = parseInput(input, 'time');
    if (!vehicles) {
      res.status(400).json({ error: 'Vehicle information required for delivery time calculation' });
      return;
    }

    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);
    res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/delivery/transit
 * Body: { input: string, transitPackages: TransitPackageInput[] }
 * Returns: TransitAwareResult
 */
deliveryRouter.post('/transit', calculationRateLimiter, validate(transitSchema), (req: Request, res: Response) => {
  try {
    const { input, transitPackages } = req.body;

    const result = calculateDeliveryTimeWithTransit(input, transitPackages as TransitPackageInput[]);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});
