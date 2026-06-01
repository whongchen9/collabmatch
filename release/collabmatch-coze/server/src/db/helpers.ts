/** create / insertMany 在单条与批量间统一收窄类型 */
export function asOne<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0]! : value;
}

export function asMany<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
