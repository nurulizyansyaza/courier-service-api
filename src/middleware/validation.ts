import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { MAX_INPUT_LENGTH } from '../config';

// Shared schema: input must be a non-empty string
const inputField = z.string().min(1, 'Input must be a non-empty string').max(MAX_INPUT_LENGTH, 'Input exceeds maximum length');

// POST /api/cost
export const costSchema = z.object({
  input: inputField,
});

// POST /api/delivery
export const deliverySchema = z.object({
  input: inputField,
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
      const messages = result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      });
      res.status(400).json({ error: messages.length === 1 ? messages[0] : messages.join('; ') });
      return;
    }
    req.body = result.data;
    next();
  };
}
