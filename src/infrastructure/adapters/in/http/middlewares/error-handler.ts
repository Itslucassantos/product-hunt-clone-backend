import type { ErrorRequestHandler, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { MAX_PRODUCT_IMAGE_BYTES } from '../../../../../application/use-cases/products/upload-product-image';
import { ImageTooLargeError } from '../../../../../domain/errors/image-too-large-error';
import { DomainError } from '../../../../../domain/errors/domain-error';
import type { Logger } from '../../../../logging/logger';
import { ERROR_CATALOG, statusFor } from '../error-catalog';
import type { ErrorCode } from '../error-catalog';

export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  const status = ERROR_CATALOG[code];
  res.status(status).json({
    error: {
      code,
      status,
      message,
      requestId: res.locals.requestId,
      ...(details === undefined ? {} : { details }),
    },
  });
}

function isMalformedBody(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { type, status } = err as { type?: unknown; status?: unknown };
  return (
    err instanceof SyntaxError ||
    (typeof type === 'string' && type.startsWith('entity.')) ||
    status === 400
  );
}

function zodFieldCode(issue: ZodError['issues'][number]): string {
  if (issue.code === 'too_big') return 'TOO_LONG';
  if (issue.code === 'too_small') return 'TOO_SHORT';
  if (issue.code === 'invalid_format' && issue.format === 'url') return 'INVALID_URL';
  if (issue.code === 'invalid_type' && issue.message.endsWith('received undefined')) {
    return 'REQUIRED';
  }
  return 'INVALID';
}

function zodFieldErrors(error: ZodError) {
  return error.issues.map((issue) => ({ field: issue.path.join('.'), code: zodFieldCode(issue) }));
}

export interface ErrorHooks {
  onError?(info: { code: ErrorCode; status: number; err: unknown; requestId?: string }): void;
}

export function errorHandler(logger: Logger, hooks: ErrorHooks = {}): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const fail = (code: ErrorCode, message: string, details?: unknown): void => {
      hooks.onError?.({
        code,
        status: ERROR_CATALOG[code],
        err,
        requestId: res.locals.requestId,
      });
      sendError(res, code, message, details);
    };

    const context = { requestId: res.locals.requestId, method: req.method, route: req.path };

    if (err instanceof DomainError) {
      const code = (err.code in ERROR_CATALOG ? err.code : 'INTERNAL_ERROR') as ErrorCode;
      const status = statusFor(err.code);
      if (status >= 500) logger.error({ ...context, err }, err.message);
      else logger.warn({ ...context, code }, err.message);
      fail(code, err.message, err.details);
      return;
    }

    if (err instanceof ZodError) {
      logger.warn({ ...context, code: 'VALIDATION_ERROR' }, 'validation failed');
      fail('VALIDATION_ERROR', 'Request validation failed', zodFieldErrors(err));
      return;
    }

    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const tooLarge = new ImageTooLargeError(MAX_PRODUCT_IMAGE_BYTES);
        logger.warn({ ...context, code: tooLarge.code }, tooLarge.message);
        fail('IMAGE_TOO_LARGE', tooLarge.message, tooLarge.details);
        return;
      }
      logger.warn({ ...context, code: 'MALFORMED_REQUEST' }, err.message);
      fail('MALFORMED_REQUEST', 'Malformed request');
      return;
    }

    if (isMalformedBody(err)) {
      logger.warn({ ...context, code: 'MALFORMED_REQUEST' }, 'malformed request');
      fail('MALFORMED_REQUEST', 'Malformed request');
      return;
    }

    logger.error({ ...context, err }, 'unexpected error');
    fail('INTERNAL_ERROR', 'Internal server error');
  };
}
