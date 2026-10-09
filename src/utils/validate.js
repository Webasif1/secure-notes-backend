import { z } from 'zod';
import mongoose from 'mongoose';
import { AppError } from './AppError.js';

export const objectId = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: 'Invalid id' });

/** Parses `data` with a zod schema, throwing a 400 AppError on failure. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new AppError(400, 'Validation failed', details);
  }
  return result.data;
}

export const toObjectId = (id) => new mongoose.Types.ObjectId(parse(objectId, id));
