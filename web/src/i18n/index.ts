import { useState } from 'react';
import { zh } from './zh';
import { en } from './en';
import type { Lang } from '../types';

export const I18N = { zh, en } as const;
export type I18NStrings = { [K in keyof typeof zh]: string };

export function useLocalLang() {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('pingcomp_lang') === 'en' ? 'en' : 'zh'));
  const setLang = (v: Lang) => { localStorage.setItem('pingcomp_lang', v); setLangState(v); };
  return { lang, setLang, t: I18N[lang] };
}
