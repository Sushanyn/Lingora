export const LANGUAGES: Record<string, { name: string, flag: string }> = {
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  cs: { name: 'Czech', flag: '🇨🇿' },
  uk: { name: 'Ukrainian', flag: '🇺🇦' },
  ru: { name: 'Russian', flag: '🇷🇺' },
  en: { name: 'English', flag: '🇬🇧' },
};

export const getLanguageFlag = (code: string | undefined): string => {
  if (!code) return '';
  return LANGUAGES[code]?.flag || '🏳️';
};

export const getLanguageName = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  return LANGUAGES[code]?.name || code.toUpperCase();
};

export const getLanguageLabel = (code: string | undefined): string => {
  if (!code) return 'Unknown';
  const lang = LANGUAGES[code];
  if (!lang) return `🏳️ ${code.toUpperCase()}`;
  return `${lang.flag} ${lang.name}`;
};
