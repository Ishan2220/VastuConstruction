import type { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodEffects } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type ValidatableSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export const validate = (schema: ValidatableSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ApiError(400, 'Validation failed', errorMessages);
      }
      next(error);
    }
  };
};
