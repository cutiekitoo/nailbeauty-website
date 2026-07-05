export const t = (key: string) => {
  const language = localStorage.getItem('language') || 'fr';
  const translations = language === 'fr' ? require('./i18n/fr').default : require('./i18n/ar').default;
  return translations[key] || key;
};
