import { env } from '../config/env.js';

export type DbDriver = 'mongo' | 'postgres' | 'cloudbase';

export function resolveDbDriver(): DbDriver {
  const explicit = env.dbDriver;
  if (explicit === 'cloudbase' || explicit === 'postgres' || explicit === 'mongo') return explicit;
  const url = env.databaseUrl.toLowerCase();
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgres';
  return 'mongo';
}

export function useCloudBase(): boolean { return resolveDbDriver() === 'cloudbase'; }

export function usePostgres(): boolean {
  return resolveDbDriver() === 'postgres';
}

export function useMongo(): boolean {
  return resolveDbDriver() === 'mongo';
}
