import { create } from 'zustand';
import { translations, type Language } from './translations';

type TFunc = (key: string, params?: Record<string, string | number>) => string;

function createT(lang: Language): TFunc {
  return (key, params) => {
    const dict = translations[lang] as unknown as Record<string, unknown>;
    const keys = key.split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? ''));
    }
    return value;
  };
}

interface I18nState {
  language: Language;
  t: TFunc;
  setLanguage: (lang: Language) => void;
}

const initialLang: Language = (localStorage.getItem('trailmate_lang') as Language) || 'zh';

export const useI18n = create<I18nState>((set) => ({
  language: initialLang,
  t: createT(initialLang),
  setLanguage: (lang) => {
    localStorage.setItem('trailmate_lang', lang);
    set({ language: lang, t: createT(lang) });
  },
}));

/** 获取当前语言 */
export function useLanguage(): Language {
  return useI18n((s) => s.language);
}

/** 翻译 hook，语言变化时自动重渲染 */
export function useT(): TFunc {
  return useI18n((s) => s.t);
}
