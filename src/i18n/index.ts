import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { keys } from 'lodash';
import { initReactI18next } from 'react-i18next';

export const supportedLanguages: { [k: string]: string } = {
  en: 'English',
  vi: 'Tiếng Việt',
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: keys(supportedLanguages),
    fallbackLng: 'en',
  });

export default i18n;
