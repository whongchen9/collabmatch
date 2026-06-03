import mongoose, { Schema } from 'mongoose';
import { usePostgres, useCloudBase } from './driver.js';
import { createPgModel, type DocRecord, type PgModel } from './postgres/docModel.js';
import { createCloudBaseModel } from './cloudbase/model.js';

/**
 * 统一导出：本地 Mongo / PostgreSQL / CloudBase 三选一。
 *
 * 返回类型为 `any` 是当前多驱动架构的权衡：
 * 不同驱动返回的模型类型（Mongoose Model / PgModel / CloudBase）api 相似但类型不兼容，
 * 调用方通过运行时驱动判断使用对应 api。后续可通过泛型工厂模式收窄类型。
 */
export function defineModel<T extends DocRecord>(
  mongooseName: string,
  pgCollection: string,
  schema: Schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (useCloudBase()) {
    // CloudBase DB: 集合名用 snake_case（与 xiaoChen-dao 保持一致）
    const cbName = pgCollection || mongooseName.toLowerCase() + 's';
    return createCloudBaseModel(cbName);
  }
  if (usePostgres()) {
    const pg = createPgModel<T>(pgCollection);
    return {
      ...pg,
      insertMany: (docs: Record<string, unknown>[]) => pg.create(docs),
    };
  }
  return mongoose.model<T>(mongooseName, schema);
}
