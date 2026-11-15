import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

import en from './translations/en';
import es from './translations/es';

const LANGUAGES = {
  en,
  es,
};

const LANG_CODES = Object.keys(LANGUAGES);


const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: callback => {
    AsyncStorage.getItem('user-language', (err, language) => {
      if (err || !language) {
        callback('en');
        return;
      }
      callback(language);
    });
  },
  init: () => {},
  cacheUserLanguage: language => {
    AsyncStorage.setItem('user-language', language);
  }
};


i18n
  // detect language
  .use(LANGUAGE_DETECTOR)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // set options
  .init({
    resources: LANGUAGES,
    compatibilityJSON: 'v3',
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false
    }
  });