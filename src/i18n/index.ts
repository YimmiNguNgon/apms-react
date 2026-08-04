import i18n from 'i18next';
import type { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const LANG_STORAGE_KEY = 'apms-language';
export const SUPPORTED_LANGS = ['vi', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

const resources: Record<string, Record<string, Record<string, unknown>>> = {};

const modules = import.meta.glob('../locales/*/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

for (const path of Object.keys(modules)) {
  const match = path.match(/\/(vi|en)\/([^/]+)\.json$/);
  if (!match) continue;
  const lang = match[1];
  const namespace = match[2];
  resources[lang] ??= {};
  resources[lang][namespace] = modules[path].default;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: resources as unknown as Resource,
    fallbackLng: 'vi',
    supportedLngs: [...SUPPORTED_LANGS],
    load: 'currentOnly',
    defaultNS: 'common',
    ns: [...Object.keys(resources.vi ?? {}), 'common'],
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;
