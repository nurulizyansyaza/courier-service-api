import { Router, Request, Response } from 'express';
import {
  parseInputBlock,
  estimateDelivery,
  estimateDetailedDelivery,
  calculateDeliveryTimeWithTransit,
  DEFAULT_CALC_OFFERS,
  toOfferArray,
  TransitPackageInput,
} from '@nurulizyansyaza/courier-service-core';

export const deliveryRouter = Router();

/**
 * POST /api/delivery
 * Body: { input: string, detailed?: boolean }
 * Returns: { results: [...] }
 */
deliveryRouter.post('/', (req: Request, res: Response) => {
  try {
    const { input, detailed } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "input" field' });
      return;
    }

    const { baseCost, packages, vehicles } = parseInputBlock(input, 'time');
    if (!vehicles) {
      res.status(400).json({ error: 'Vehicle information required for delivery time calculation' });
      return;
    }

    const isDetailed = detailed === true || detailed === 'true';

    if (isDetailed) {
      const results = estimateDetailedDelivery(baseCost, packages, DEFAULT_CALC_OFFERS, vehicles);
      res.json({ results });
    } else {
      const fleet = { count: vehicles.count, maxSpeed: vehicles.maxSpeed, maxWeight: vehicles.maxWeight };
      const results = estimateDelivery(baseCost, packages, toOfferArray(DEFAULT_CALC_OFFERS), fleet);
      res.json({
        results: results.map(r => ({
          id: r.id,
          discount: r.discount,
          cost: r.cost,
          time: r.time,
        })),
      });
    }
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
deliveryRouter.post('/transit', (req: Request, res: Response) => {
  try {
    const { input, transitPackages } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "input" field' });
      return;
    }

    const transit: TransitPackageInput[] = Array.isArray(transitPackages) ? transitPackages : [];
    const result = calculateDeliveryTimeWithTransit(input, transit, DEFAULT_CALC_OFFERS);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});
