import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Shared schema: input must be a non-empty string
const inputField = z.string().min(1, 'Input must be a non-empty string').max(5000, 'Input exceeds maximum length');

// POST /api/cost
export const costSchema = z.object({
  input: inputField,
});

// POST /api/delivery
export const deliverySchema = z.object({
  input: inputField,
  detailed: z.preprocess(
    (val) => {
      if (val === 'true') return true;
      if (val === 'false' || val === undefined) return false;
      return val;
    },
    z.boolean(),
  ).optional(),
});

// POST /api/delivery/transit
export const transitSchema = z.object({
  input: inputField,
  transitPackages: z
    .array(
      z.object({
        id: z.string().min(1),
        weight: z.number().positive(),
        distance: z.number().nonnegative(),
        offerCode: z.string(),
      }),
    )
    .optional()
    .default([]),
});

// Generic validation middleware factory
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({ error: firstError.message });
      return;
    }
    req.body = result.data;
    next();
  };
}
