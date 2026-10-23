import type { ZodType } from 'zod';
import { HttpError } from './errors.js';

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));

    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Please check the submitted details and try again.',
      details,
    );
  }

  return result.data;
}
