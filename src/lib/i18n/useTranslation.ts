"use client";

import { useEffect, useState } from "react";
import {
  type Locale,
  type Strings,
  translations,
  detectLocale,
} from "./translations";

const STORAGE_KEY = "trustela.locale";

/**
 * 현재 언어와 번역 문자열을 반환. 우선순위: localStorage > 브라우저 언어 > en.
 * setLocale 로 변경 시 localStorage 저장 + <html lang> 갱신.
 */
export function useTranslation(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
} {
  // SSR/최초 렌더는 en 으로 고정(하이드레이션 불일치 방지) → 마운트 후 실제 언어로 교체.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const initial =
      stored ?? detectLocale(navigator.languages ?? [navigator.language]);
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  return { locale, setLocale, t: translations[locale] };
}
