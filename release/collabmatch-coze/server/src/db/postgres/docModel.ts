import type { Pool } from 'pg';
import { getPgPool } from './pool.js';
import { filterToSql, type MongoFilter } from './filter.js';
import { newObjectId, oidString, PgObjectId, type AnyObjectId } from '../objectId.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocRecord = Record<string, any> & {
  _id: AnyObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  save(): Promise<DocRecord>;
};

function reviveDates(obj: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (
      typeof v === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(v) &&
      (k.endsWith('At') || k === 'time' || k === 'expiresAt' || k === 'sentAt')
    ) {
      obj[k] = new Date(v);
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          reviveDates(item as Record<string, unknown>);
        }
      }
    }
  }
}

function hydrate(collection: string, row: { id: string; doc: Record<string, unknown> }): DocRecord {
  const doc = { ...row.doc } as DocRecord;
  reviveDates(doc);
  doc._id = new PgObjectId(row.id);
  if (row.doc.createdAt) doc.createdAt = new Date(row.doc.createdAt as string);
  if (row.doc.updatedAt) doc.updatedAt = new Date(row.doc.updatedAt as string);

  doc.save = async function save(this: DocRecord) {
    const id = oidString(this._id);
    const payload = stripInternal(this);
    const now = new Date().toISOString();
    payload.updatedAt = now;
    if (!payload.createdAt) payload.createdAt = now;
    await getPgPool().query(
      `UPDATE cm_documents SET doc = $1::jsonb, updated_at = $2 WHERE collection = $3 AND id = $4`,
      [JSON.stringify(payload), now, collection, id],
    );
    return this;
  };

  return doc;
}

function stripInternal(doc: DocRecord): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };
  delete out._id;
  delete out.save;
  delete out.toObject;
  delete out.toJSON;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v instanceof PgObjectId) out[k] = v.toString();
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (Array.isArray(v)) out[k] = v.map(serializeValue);
    else if (v && typeof v === 'object') out[k] = serializeNested(v as Record<string, unknown>);
  }
  return out;
}

function serializeNested(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = serializeValue(v);
  }
  return out;
}

function serializeValue(v: unknown): unknown {
  if (v instanceof PgObjectId) return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === 'object') return serializeNested(v as Record<string, unknown>);
  return v;
}

function normalizeCreateData(data: Record<string, unknown>): Record<string, unknown> {
  const out = serializeNested({ ...data }) as Record<string, unknown>;
  const now = new Date().toISOString();
  if (!out.createdAt) out.createdAt = now;
  out.updatedAt = now;
  for (const [k, v] of Object.entries(out)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && k === 'portfolio') continue;
  }
  return out;
}

class PgQuery<T extends DocRecord> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private limitN: number | null = null;

  constructor(
    private readonly collection: string,
    private readonly filter: MongoFilter,
  ) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  populate(): this {
    return this;
  }

  private buildSql(): { sql: string; params: unknown[] } {
    const { where, params } = filterToSql(this.filter);
    let sql = `SELECT id, doc FROM cm_documents WHERE collection = $${params.length + 1} AND ${where}`;
    params.push(this.collection);
    if (this.sortSpec) {
      const [field, dir] = Object.entries(this.sortSpec)[0] ?? ['updatedAt', -1];
      sql += ` ORDER BY doc->>'${field}' ${dir === -1 ? 'DESC' : 'ASC'}`;
    }
    if (this.limitN != null) sql += ` LIMIT ${Math.max(1, this.limitN)}`;
    return { sql, params };
  }

  async exec(): Promise<T[]> {
    const pool = getPgPool();
    const { sql, params } = this.buildSql();
    const res = await pool.query(sql, params);
    return res.rows.map((r: { id: string; doc: Record<string, unknown> }) => hydrate(this.collection, r) as T);
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export interface PgModel<T extends DocRecord> {
  find(filter?: MongoFilter): PgQuery<T>;
  findOne(filter: MongoFilter): Promise<T | null>;
  findById(id: string | AnyObjectId): Promise<T | null>;
  create(data: Record<string, unknown> | Record<string, unknown>[]): Promise<T | T[]>;
  countDocuments(filter?: MongoFilter): Promise<number>;
  findOneAndUpdate(
    filter: MongoFilter,
    update: Record<string, unknown>,
    options?: { upsert?: boolean; new?: boolean },
  ): Promise<T | null>;
  findOneAndDelete(filter: MongoFilter): Promise<T | null>;
  deleteOne(filter: MongoFilter): Promise<{ deletedCount: number }>;
  deleteMany(filter: MongoFilter): Promise<{ deletedCount: number }>;
}

export function createPgModel<T extends DocRecord>(collection: string): PgModel<T> {
  return {
    find(filter = {}) {
      return new PgQuery<T>(collection, filter);
    },

    async findOne(filter: MongoFilter): Promise<T | null> {
      const rows = await new PgQuery<T>(collection, filter).limit(1).exec();
      return rows[0] ?? null;
    },

    async findById(id: string | AnyObjectId): Promise<T | null> {
      return this.findOne({ _id: id });
    },

    async create(data: Record<string, unknown> | Record<string, unknown>[]): Promise<T | T[]> {
      const pool = getPgPool();
      const items = Array.isArray(data) ? data : [data];
      const created: T[] = [];
      for (const raw of items) {
        const id = new PgObjectId().toString();
        const doc = normalizeCreateData(raw);
        await pool.query(
          `INSERT INTO cm_documents (collection, id, doc, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW(), NOW())`,
          [collection, id, JSON.stringify(doc)],
        );
        created.push(hydrate(collection, { id, doc }) as T);
      }
      return Array.isArray(data) ? created : created[0]!;
    },

    async countDocuments(filter = {}): Promise<number> {
      const { where, params } = filterToSql(filter);
      const pool = getPgPool();
      const res = await pool.query(
        `SELECT COUNT(*)::int AS c FROM cm_documents WHERE collection = $${params.length + 1} AND ${where}`,
        [...params, collection],
      );
      return res.rows[0]?.c ?? 0;
    },

    async findOneAndUpdate(filter, update, options = {}): Promise<T | null> {
      const existing = await this.findOne(filter);
      if (!existing) {
        if (!options.upsert) return null;
        const merged = { ...filter, ...flattenUpdate(update) };
        if ('$inc' in update && update.$inc && typeof update.$inc === 'object') {
          for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
            merged[k] = v;
          }
        }
        return (await this.create(merged)) as T;
      }
      applyUpdate(existing, update);
      await existing.save();
      return existing;
    },

    async findOneAndDelete(filter: MongoFilter): Promise<T | null> {
      const existing = await this.findOne(filter);
      if (!existing) return null;
      const pool = getPgPool();
      await pool.query(`DELETE FROM cm_documents WHERE collection = $1 AND id = $2`, [
        collection,
        oidString(existing._id),
      ]);
      return existing;
    },

    async deleteOne(filter: MongoFilter): Promise<{ deletedCount: number }> {
      const doc = await this.findOneAndDelete(filter);
      return { deletedCount: doc ? 1 : 0 };
    },

    async deleteMany(filter: MongoFilter): Promise<{ deletedCount: number }> {
      const { where, params } = filterToSql(filter);
      const pool = getPgPool();
      const res = await pool.query(
        `DELETE FROM cm_documents WHERE collection = $${params.length + 1} AND ${where}`,
        [...params, collection],
      );
      return { deletedCount: res.rowCount ?? 0 };
    },
  };
}

function flattenUpdate(update: Record<string, unknown>): Record<string, unknown> {
  if ('$set' in update && update.$set && typeof update.$set === 'object') {
    return update.$set as Record<string, unknown>;
  }
  const out = { ...update };
  delete out.$inc;
  return out;
}

function applyUpdate(existing: DocRecord, update: Record<string, unknown>): void {
  if ('$inc' in update && update.$inc && typeof update.$inc === 'object') {
    for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
      const cur = Number((existing as Record<string, unknown>)[k] ?? 0);
      (existing as Record<string, unknown>)[k] = cur + v;
    }
  }
  Object.assign(existing, flattenUpdate(update));
}

export async function initPostgres(): Promise<void> {
  const { migratePostgres } = await import('./migrate.js');
  await migratePostgres();
}
