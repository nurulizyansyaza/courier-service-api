import { Router, Request, Response } from 'express';
import {
  parseInputBlock,
  estimateDelivery,
  estimateDetailedDelivery,
  calculateDeliveryTimeWithTransit,
  CalcOfferCriteria,
  Offer,
  TransitPackageInput,
} from '@nurulizyansyaza/courier-service-core';

const DEFAULT_CALC_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

function toOfferArray(offers: Record<string, CalcOfferCriteria>): Offer[] {
  return Object.entries(offers).map(([code, c]) => ({
    code,
    discount: c.discount,
    weight: { min: c.minWeight, max: c.maxWeight },
    distance: { min: c.minDistance, max: c.maxDistance },
  }));
}

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

    if (detailed) {
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
