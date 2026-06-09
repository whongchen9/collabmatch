// @ts-nocheck -- CloudBase SDK 类型兼容性，仅在 cloudbase 驱动下使用
/**
 * CloudBase Model Adapter
 * 
 * 将 CloudBase DB 集合封装为 Mongoose 风格的 Model 接口，
 * 让现有路由代码无需改动即可切换数据库。
 */

import { getDb, type CloudBaseConfig } from './init.js';

interface QueryOption {
  sort?: { [key: string]: -1 | 1 };
  skip?: number;
  limit?: number;
  lean?: boolean;
  populate?: string | string[];
}

interface CloudBaseQuery {
  _collection: string;
  _filter: Record<string, unknown>;
  _options: QueryOption;
  where(f: Record<string, unknown>): CloudBaseQuery;
  sort(s: Record<string, -1 | 1>): CloudBaseQuery;
  limit(n: number): CloudBaseQuery;
  skip(n: number): CloudBaseQuery;
  lean(): CloudBaseQuery;
  populate(path: string | string[]): CloudBaseQuery;
  exec(): Promise<Record<string, unknown>[]>;
  then<T>(resolve: (docs: Record<string, unknown>[]) => T): Promise<T>;
}

class CBQuery implements CloudBaseQuery {
  _collection: string;
  _filter: Record<string, unknown>;
  _options: QueryOption;

  constructor(collection: string, filter: Record<string, unknown> = {}) {
    this._collection = collection;
    this._filter = filter;
    this._options = {};
  }

  where(f: Record<string, unknown>): this { Object.assign(this._filter, f); return this; }
  sort(s: Record<string, -1 | 1>): this { this._options.sort = s; return this; }
  limit(n: number): this { this._options.limit = n; return this; }
  skip(n: number): this { this._options.skip = n; return this; }

  lean(): this {
    this._options.lean = true;
    return this;
  }

  populate(_path: string | string[]): this {
    this._options.populate = Array.isArray(_path) ? _path : [_path];
    return this;
  }

  then<T>(resolve: (docs: Record<string, unknown>[]) => T): Promise<T> {
    return this.exec().then(resolve);
  }

  async exec(): Promise<Record<string, unknown>[]> {
    const db = getDb();
    let query = db.collection(this._collection);

    // Build CloudBase where query
    const where: Record<string, unknown> = { ...this._filter };

    // Handle $or
    if (where.$or) {
      // CloudBase supports _.or
      const orConditions = (where.$or as Record<string, unknown>[]).map(cond => {
        const c: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(cond)) {
          if (typeof v === 'object' && v !== null && '$regex' in (v as Record<string, unknown>)) {
            c[k] = new RegExp(String((v as Record<string, unknown>).$regex), (v as Record<string, unknown>).$options as string || 'i');
          } else {
            c[k] = v;
          }
        }
        return c;
      });
      delete where.$or;
      const baseQ = query.where(where);
      query = baseQ.where({ _: db.command.or(orConditions) });
    } else {
      // Handle $regex
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(where)) {
        if (k === '$ne' || k === '$nin') continue;
        if (typeof v === 'object' && v !== null && '$regex' in (v as Record<string, unknown>)) {
          const reg = v as Record<string, unknown>;
          cleaned[k] = new RegExp(String(reg.$regex), String(reg.$options || 'i'));
        } else if (typeof v === 'object' && v !== null && '$in' in (v as Record<string, unknown>)) {
          cleaned[k] = db.command.in((v as Record<string, unknown>).$in as unknown[]);
        } else {
          cleaned[k] = v;
        }
      }
      query = query.where(cleaned);
    }

    // Ordering
    if (this._options.sort) {
      const key = Object.keys(this._options.sort)[0];
      query = query.orderBy(key, this._options.sort[key] === -1 ? 'desc' : 'asc');
    }

    // Skip / limit
    if (this._options.skip) query = query.skip(this._options.skip);
    if (this._options.limit) query = query.limit(this._options.limit);

    const res = await query.get();
    let docs = (res.data || []) as Record<string, unknown>[];

    // Convert _id to string for consistency with Mongoose
    docs = docs.map(d => ({
      ...d,
      _id: String(d._id),
      id: String(d._id),
    }));

    // Handle populate
    if (this._options.populate) {
      docs = await this._populateFields(docs, this._options.populate);
    }

    return docs;
  }

  private async _populateFields(
    docs: Record<string, unknown>[],
    paths: string[],
  ): Promise<Record<string, unknown>[]> {
    const db = getDb();
    for (const path of paths) {
      // e.g., path = 'author' → fetch from users collection
      const ids = [...new Set(docs.map(d => String(d[path])).filter(Boolean))];
      if (!ids.length) continue;

      const collectionName = path === 'author' ? 'users' : path + 's';

      try {
        const res = await db.collection(collectionName).where({ _id: db.command.in(ids) }).get();
        const related = (res.data || []) as Record<string, unknown>[];
        const map = new Map(related.map(r => [String(r._id), { ...r, _id: String(r._id), id: String(r._id) }]));

        for (const d of docs) {
          const val = map.get(String(d[path]));
          if (val) {
            // Only include safe fields
            (d as Record<string, unknown>)[path] = {
              _id: val._id,
              name: val.name,
              avatar: val.avatar,
              position: val.position,
              avatarColor: val.avatarColor,
              avatarUrl: val.avatarUrl,
              skills: val.skills,
              bio: val.bio,
            };
          }
        }
      } catch {
        // collection might not exist, skip silently
      }
    }
    return docs;
  }
}

/** Check if doc is a CBModel instance (has _collection and save/remove) */
function isCBModel(doc: unknown): doc is CBModel {
  return typeof doc === 'object' && doc !== null && '_collection' in doc;
}

class CBModel {
  _collection: string;
  _data: Record<string, unknown>;

  constructor(collection: string, data: Record<string, unknown> = {}) {
    this._collection = collection;
    this._data = { ...data };
    // Proxy to allow property access
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'string' && prop !== 'then') {
          return target._data[prop];
        }
        return undefined;
      },
      set(target, prop, value) {
        if (prop in target) { (target as any)[prop] = value; return true; }
        target._data[prop as string] = value;
        return true;
      },
    }) as any;
  }

  async save(): Promise<Record<string, unknown>> {
    if (this._data._id) {
      const id = String(this._data._id);
      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(this._data)) {
        if (k !== '_id' && k !== '_collection') update[k] = v;
      }
      update.updatedAt = new Date();
      await getDb().collection(this._collection).doc(id).update(update);
      return { ...this._data, _id: id, updatedAt: update.updatedAt };
    } else {
      const now = new Date();
      const data = { ...this._data, createdAt: now, updatedAt: now };
      const res = await getDb().collection(this._collection).add(data);
      this._data._id = String(res.id);
      return { ...this._data, _id: String(res.id) };
    }
  }

  async remove(): Promise<void> {
    if (this._data._id) {
      await getDb().collection(this._collection).doc(String(this._data._id)).remove();
    }
  }

  set(path: string, value: unknown): this { this._data[path] = value; return this; }
  get(path: string): unknown { return this._data[path]; }
}

export function createCloudBaseModel(collectionName: string) {
  return {
    // ─── CREATE ──────────────────────────────────
    async create(docs: Record<string, unknown> | Record<string, unknown>[]) {
      const arr = Array.isArray(docs) ? docs : [docs];
      const results = await Promise.all(
        arr.map(async d => {
          const now = new Date();
          const data = { ...d, createdAt: now, updatedAt: now };
          delete data._id;
          const res = await getDb().collection(collectionName).add(data);
          return { ...data, _id: String(res.id) };
        }),
      );
      return results.length === 1 ? results[0] : results;
    },

    // ─── READ ────────────────────────────────────
    async findById(id: string) {
      const res = await getDb().collection(collectionName).doc(String(id)).get();
      if (!res.data || res.data.length === 0) return null;
      const doc = (Array.isArray(res.data) ? res.data[0] : res.data) as Record<string, unknown>;
      return new CBModel(collectionName, { ...doc, _id: String(doc._id || id) });
    },

    find(filter: Record<string, unknown> = {}) {
      return new CBQuery(collectionName, filter);
    },

    async findOne(filter: Record<string, unknown> = {}) {
      const docs = await new CBQuery(collectionName, filter).limit(1).exec();
      return docs.length ? docs[0] : null;
    },

    // ─── UPDATE ──────────────────────────────────
    async findByIdAndUpdate(id: string, update: Record<string, unknown>, opts?: { new?: boolean }) {
      const data: Record<string, unknown> = {};
      // Handle $set operator
      if (update.$set) { Object.assign(data, update.$set as Record<string, unknown>); }
      else { Object.assign(data, update); }
      delete data._id;
      data.updatedAt = new Date();

      const docId = String(id);
      // Update or upsert
      const existing = await getDb().collection(collectionName).doc(docId).get();
      if (existing.data && (Array.isArray(existing.data) ? existing.data.length > 0 : existing.data)) {
        await getDb().collection(collectionName).doc(docId).update(data);
      } else {
        data._id = docId;
        delete data._id; // CloudBase auto-generates ID, so we need to use add instead
        data.createdAt = new Date();
        const res = await getDb().collection(collectionName).add({ ...data, _id: docId });
        data._id = String(res.id);
      }

      if (opts?.new) {
        const updated = await getDb().collection(collectionName).doc(docId).get();
        return (Array.isArray(updated.data) ? updated.data[0] : updated.data) as Record<string, unknown> || data;
      }
      return data;
    },

    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      const docs = await new CBQuery(collectionName, filter).limit(1).exec();
      if (docs.length) {
        const id = String(docs[0]._id);
        const data: Record<string, unknown> = {};
        if (update.$set) { Object.assign(data, update.$set as Record<string, unknown>); }
        else { Object.assign(data, update); }
        data.updatedAt = new Date();
        delete data._id;
        await getDb().collection(collectionName).doc(id).update(data);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },

    async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
      const docs = await new CBQuery(collectionName, filter).exec();
      const data: Record<string, unknown> = {};
      if (update.$set) { Object.assign(data, update.$set as Record<string, unknown>); }
      else { Object.assign(data, update); }
      data.updatedAt = new Date();
      delete data._id;

      for (const doc of docs) {
        await getDb().collection(collectionName).doc(String(doc._id)).update({ ...data });
      }
      return { matchedCount: docs.length, modifiedCount: docs.length };
    },

    // ─── DELETE ──────────────────────────────────
    async deleteOne(filter: Record<string, unknown>) {
      const docs = await new CBQuery(collectionName, filter).limit(1).exec();
      if (docs.length) {
        await getDb().collection(collectionName).doc(String(docs[0]._id)).remove();
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },

    async deleteMany(filter: Record<string, unknown> = {}) {
      const docs = await new CBQuery(collectionName, filter).exec();
      for (const doc of docs) {
        await getDb().collection(collectionName).doc(String(doc._id)).remove();
      }
      return { deletedCount: docs.length };
    },

    // ─── MISC ────────────────────────────────────
    async countDocuments(filter: Record<string, unknown> = {}) {
      const res = await getDb().collection(collectionName).where(filter).count();
      return res.total || 0;
    },

    async distinct(field: string) {
      const docs = await new CBQuery(collectionName).exec();
      return [...new Set(docs.map(d => d[field]))];
    },

    // Constructor for manual doc creation
    new(data: Record<string, unknown>) {
      return new CBModel(collectionName, data);
    },
  };
}
