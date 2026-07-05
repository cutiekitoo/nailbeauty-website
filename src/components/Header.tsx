import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/LanguageProvider";
import { useTranslation } from "@/i18n/useTranslation";

export function Header() {
  const { count, open } = useCart();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">

        <Link to="/" className="font-display text-2xl font-semibold">
          Nail <span className="text-primary">Beauty</span>
        </Link>

        <div className="flex items-center gap-3">

          {/* LANGUAGE BUTTON */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 rounded-full border text-xs font-semibold bg-card hover:bg-secondary transition"
          >
            {language === "fr" ? t("arabic") : t("french")}
          </button>

          {/* CART BUTTON */}
          <button
            onClick={open}
            className="relative grid place-items-center h-11 w-11 rounded-full bg-card border"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 rounded-full">
                {count}
              </span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
}