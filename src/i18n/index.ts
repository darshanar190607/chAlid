import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './translations/en.json';
import hi from './translations/hi.json';
import ta from './translations/ta.json';
import te from './translations/te.json';
import kn from './translations/kn.json';
import ml from './translations/ml.json';
import bn from './translations/bn.json';
import mr from './translations/mr.json';
import gu from './translations/gu.json';
import pa from './translations/pa.json';
import or from './translations/or.json';
import as from './translations/as.json';
import ur from './translations/ur.json';
import raj from './translations/raj.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      ml: { translation: ml },
      bn: { translation: bn },
      mr: { translation: mr },
      gu: { translation: gu },
      pa: { translation: pa },
      or: { translation: or },
      as: { translation: as },
      ur: { translation: ur },
      raj: { translation: raj },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
