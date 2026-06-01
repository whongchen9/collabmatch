/** 从技能输出中提取 HTML 原型代码 */
export function extractProtoHtml(content: string): string | null {
  const fenced = content.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  if (/<html[\s>]/i.test(content) || /<!DOCTYPE/i.test(content)) {
    return content.trim();
  }

  return null;
}

export function wrapProtoHtml(inner: string, title = '原型预览'): string {
  if (/<html[\s>]/i.test(inner)) return inner;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:#f8fafc;color:#1e293b;}
.card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
h1{font-size:18px;margin:0 0 12px;}p{font-size:13px;line-height:1.6;color:#64748b;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${inner.slice(0, 500).replace(/</g, '&lt;')}</p></div></body></html>`;
}
