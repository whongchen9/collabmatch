import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { usePostgres } from './driver.js';

export class PgObjectId {
  private readonly hex: string;

  constructor(input?: string | PgObjectId | mongoose.Types.ObjectId) {
    if (input instanceof PgObjectId) {
      this.hex = input.hex;
      return;
    }
    if (input instanceof mongoose.Types.ObjectId) {
      this.hex = input.toString();
      return;
    }
    if (typeof input === 'string' && input) {
      if (!PgObjectId.isValid(input)) throw new Error(`Invalid ObjectId: ${input}`);
      this.hex = input.toLowerCase();
      return;
    }
    this.hex = randomBytes(12).toString('hex');
  }

  toString(): string {
    return this.hex;
  }

  toHexString(): string {
    return this.hex;
  }

  static isValid(id: unknown): id is string {
    return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
  }
}

export type AnyObjectId = mongoose.Types.ObjectId | PgObjectId;

export function newObjectId(input?: string | AnyObjectId): AnyObjectId {
  if (usePostgres()) {
    if (input instanceof PgObjectId) return input;
    if (input instanceof mongoose.Types.ObjectId) return new PgObjectId(input.toString());
    return new PgObjectId(input);
  }
  if (input instanceof mongoose.Types.ObjectId) return input;
  if (input instanceof PgObjectId) return new mongoose.Types.ObjectId(input.toString());
  return new mongoose.Types.ObjectId(input);
}

export function isValidObjectId(id: unknown): boolean {
  if (usePostgres()) return PgObjectId.isValid(id);
  return typeof id === 'string' && mongoose.isValidObjectId(id);
}

export function oidString(id: unknown): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id instanceof PgObjectId || id instanceof mongoose.Types.ObjectId) return id.toString();
  return String(id);
}

/** 兼容 `mongoose.Types` 在路由/服务中的引用 */
export const Types = {
  get ObjectId() {
    return usePostgres() ? PgObjectId : mongoose.Types.ObjectId;
  },
};
