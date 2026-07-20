import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
    if (message === 'Validation failed' && Array.isArray(errors) && errors.length > 0) {
      const fieldDetails = errors.map((e: any) => `${e.field || 'field'}: ${e.message}`).join(', ');
      message = `Validation Error (${fieldDetails})`;
    }
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = `Duplicate value for field: ${(err.meta?.target as string[])?.join(', ') || 'unknown'}`;
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Invalid reference: related record not found';
        break;
      default:
        statusCode = 400;
        message = err.message;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    const errText = err.message || '';
    const argMatch = errText.match(/Argument `([^`]+)`/);
    const expectedMatch = errText.match(/Expected ([^,]+)/);
    if (argMatch && expectedMatch) {
      message = `Invalid data for '${argMatch[1]}': expected ${expectedMatch[1]}`;
    } else {
      const cleanLines = errText.split('\n').map(l => l.trim()).filter(Boolean);
      const lastLine = cleanLines[cleanLines.length - 1] || 'Invalid data provided';
      message = `Invalid data: ${lastLine.replace(/`/g, "'")}`;
    }
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err instanceof SyntaxError) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  logger.error(`[${statusCode}] ${message}`, {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
