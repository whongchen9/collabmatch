import { oidString } from '../objectId.js';

export type MongoFilter = Record<string, unknown>;

type SqlParts = { where: string; params: unknown[] };

function pushRef(parts: SqlParts, field: string, op: string, value: unknown): void {
  const idx = parts.params.length + 1;
  const jsonPath = `doc->>'${field.replace(/'/g, "''")}'`;
  if (op === 'eq') {
    parts.where += ` AND ${jsonPath} = $${idx}`;
    parts.params.push(oidString(value) || value);
  } else if (op === 'ne') {
    parts.where += ` AND (${jsonPath} IS NULL OR ${jsonPath} <> $${idx})`;
    parts.params.push(oidString(value) || value);
  } else if (op === 'in') {
    const arr = (value as unknown[]).map((v) => oidString(v) || v);
    parts.where += ` AND ${jsonPath} = ANY($${idx}::text[])`;
    parts.params.push(arr);
  }
}

function parseIdFilter(parts: SqlParts, key: string, val: unknown): void {
  if (key !== '_id' && key !== 'id') return;
  if (val && typeof val === 'object' && '$in' in (val as object)) {
    const ids = ((val as { $in: unknown[] }).$in || []).map(oidString).filter(Boolean);
    const idx = parts.params.length + 1;
    parts.where += ` AND id = ANY($${idx}::text[])`;
    parts.params.push(ids);
    return;
  }
  const idx = parts.params.length + 1;
  parts.where += ` AND id = $${idx}`;
  parts.params.push(oidString(val));
}

/** 将项目里用到的 mongoose 风格 filter 转为 SQL WHERE 片段 */
export function filterToSql(filter: MongoFilter): SqlParts {
  const parts: SqlParts = { where: 'TRUE', params: [] };

  for (const [key, val] of Object.entries(filter || {})) {
    if (key === '_id' || key === 'id') {
      parseIdFilter(parts, key, val);
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      const obj = val as Record<string, unknown>;
      if ('$in' in obj) {
        pushRef(parts, key, 'in', obj.$in);
        continue;
      }
      if ('$ne' in obj) {
        pushRef(parts, key, 'ne', obj.$ne);
        continue;
      }
    }
    if (key === 'members') {
      if (val && typeof val === 'object' && '$all' in (val as object)) {
        const ids = ((val as { $all: unknown[] }).$all || []).map(oidString).filter(Boolean);
        for (const id of ids) {
          const idx = parts.params.length + 1;
          parts.where += ` AND doc->'members' @> $${idx}::jsonb`;
          parts.params.push(JSON.stringify([id]));
        }
        continue;
      }
      if (val) {
        const idx = parts.params.length + 1;
        const needle = JSON.stringify([oidString(val)]);
        parts.where += ` AND doc->'members' @> $${idx}::jsonb`;
        parts.params.push(needle);
      }
      continue;
    }
    pushRef(parts, key, 'eq', val);
  }

  return parts;
}
