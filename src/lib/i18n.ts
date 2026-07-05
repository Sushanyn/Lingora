import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Placeholder translations for basic UI elements
const resources = {
  en: {
    translation: {
      "sidebar": {
        "dictionaries": "My Dictionaries",
        "practice": "Practice",
        "library": "Library",
        "profile": "Profile"
      },
      "theme": {
        "toggle": "Toggle Theme"
      }
    }
  },
  es: {
    translation: {
      "sidebar": {
        "dictionaries": "Mis Diccionarios",
        "practice": "Práctica",
        "library": "Biblioteca",
        "profile": "Perfil"
      },
      "theme": {
        "toggle": "Cambiar Tema"
      }
    }
  },
  // Placeholders for other requested languages
  fr: { translation: { "sidebar": { "dictionaries": "Mes Dictionnaires", "practice": "Pratique", "library": "Bibliothèque", "profile": "Profil" } } },
  cs: { translation: { "sidebar": { "dictionaries": "Moje Slovníky", "practice": "Cvičení", "library": "Knihovna", "profile": "Profil" } } },
  uk: { translation: { "sidebar": { "dictionaries": "Мої Словники", "practice": "Практика", "library": "Бібліотека", "profile": "Профіль" } } },
  ru: { translation: { "sidebar": { "dictionaries": "Мои Словари", "practice": "Практика", "library": "Библиотека", "profile": "Профиль" } } },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
