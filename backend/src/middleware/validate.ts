import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/errors';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates request parts with zod. Parsed (and coerced) values are stored:
 *  - body   -> req.body
 *  - query  -> res.locals.query
 *  - params -> res.locals.params
 */
export const validate = (schemas: Schemas) => (req: Request, res: Response, next: NextFunction) => {
  for (const part of ['params', 'query', 'body'] as const) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(part === 'body' ? (req.body ?? {}) : req[part]);
    if (!result.success) {
      throw AppError.badRequest(
        'Validation failed',
        result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        'VALIDATION_ERROR',
      );
    }
    if (part === 'body') req.body = result.data;
    else res.locals[part] = result.data;
  }
  next();
};
