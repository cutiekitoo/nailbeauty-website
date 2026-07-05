import { useLanguage } from "@/lib/LanguageProvider";
import { translations } from "./translations";

type Lang = keyof typeof translations;

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: keyof typeof translations["fr"]) => {
    return translations[language as Lang]?.[key] ?? key;
  };

  return { t, language };
}