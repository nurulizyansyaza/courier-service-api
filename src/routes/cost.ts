import { Router, Request, Response } from 'express';
import {
  parseInputBlock,
  estimateCost,
  CalcOfferCriteria,
  Offer,
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
