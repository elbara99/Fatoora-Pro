import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import en from './en.json'
import ar from './ar.json'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false }
})

dayjs.locale(i18n.language)

i18n.on('languageChanged', (lng) => {
  dayjs.locale(lng)
})

export default i18n
