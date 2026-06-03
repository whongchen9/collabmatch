import type { Request, Response, NextFunction } from 'express';

/** 字段校验规则 */
export interface FieldRule {
  /** 是否必填（undefined / null / 空字符串均视为缺失） */
  required?: boolean;
  /** 期望的 JS 类型 */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 字符串最大长度（仅对 string 类型生效） */
  maxLength?: number;
  /** 自定义校验函数，返回错误消息或 null 表示通过 */
  custom?: (val: unknown) => string | null;
}

/**
 * 创建一个输入校验中间件。
 *
 * @param rules  字段名 → 校验规则 的映射
 * @returns Express 中间件，校验失败时返回 400
 *
 * 示例：
 * ```ts
 * router.post('/foo', validate({ title: { required: true, type: 'string', maxLength: 200 } }), handler);
 * ```
 */
export function validate(rules: Record<string, FieldRule>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const val = body[field];

      // ---- required ----
      if (rule.required && (val === undefined || val === null || val === '')) {
        errors.push(`${field} 为必填字段`);
        continue; // 不再继续校验该字段
      }

      // 值为空则跳过后续类型/长度校验
      if (val === undefined || val === null || val === '') {
        continue;
      }

      // ---- type ----
      if (rule.type && typeof val !== rule.type) {
        // array 特判
        if (rule.type === 'array' && Array.isArray(val)) {
          /* ok */
        } else {
          const typeNames: Record<string, string> = {
            string: '字符串', number: '数字', boolean: '布尔值',
            array: '数组', object: '对象',
          };
          errors.push(`${field} 须为${typeNames[rule.type] || rule.type}`);
          continue;
        }
      }

      // ---- maxLength (string only) ----
      if (rule.maxLength !== undefined && typeof val === 'string' && val.length > rule.maxLength) {
        errors.push(`${field} 长度不能超过${rule.maxLength}字符`);
      }

      // ---- custom ----
      if (rule.custom) {
        const msg = rule.custom(val);
        if (msg) {
          errors.push(msg);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join('; ') });
      return;
    }

    next();
  };
}
