import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '@usta/shared';
import { AppError } from './errors';

/** Turns every error into the same JSON shape: { error: { code } }. Never leaks internals. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof AppError) {
      const body: ApiError = { error: { code: error.code, ...error.extra } };
      return reply.code(error.statusCode).send(body);
    }

    // Zod validation failed, or Fastify could not parse the body (bad JSON etc).
    const status = 'statusCode' in error ? error.statusCode : undefined;
    if (error instanceof ZodError || (status !== undefined && status >= 400 && status < 500)) {
      const body: ApiError = { error: { code: 'VALIDATION_ERROR' } };
      return reply.code(400).send(body);
    }

    request.log.error(error);
    const body: ApiError = { error: { code: 'INTERNAL_ERROR' } };
    return reply.code(500).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    const body: ApiError = { error: { code: 'NOT_FOUND' } };
    return reply.code(404).send(body);
  });
}
