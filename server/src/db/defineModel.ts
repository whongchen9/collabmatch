import mongoose, { Schema } from 'mongoose';
import { usePostgres } from './driver.js';
import { createPgModel, type DocRecord, type PgModel } from './postgres/docModel.js';

/** 统一导出：本地 Mongo / Coze PostgreSQL 二选一 */
export function defineModel<T extends DocRecord>(
  mongooseName: string,
  pgCollection: string,
  schema: Schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (usePostgres()) {
    const pg = createPgModel<T>(pgCollection);
    return {
      ...pg,
      insertMany: (docs: Record<string, unknown>[]) => pg.create(docs) as Promise<T[]>,
    };
  }
  return mongoose.model<T>(mongooseName, schema);
}
