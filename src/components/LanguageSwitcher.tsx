import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (BR)" },
] as const;

export function LanguageSwitcher() {
  const { t } = useTranslation();
  // Use the imported i18n instance directly to avoid the NO_I18NEXT_INSTANCE error
  const i18nInstance = i18n;

  const currentLanguage = languages.find((lang) => lang.code === i18nInstance.language) || languages[0];

  const handleLanguageChange = async (langCode: string) => {
    try {
      await i18nInstance.changeLanguage(langCode);
      console.log('Language changed to:', langCode);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0"
          aria-label="Change language"
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-ctp-base border-ctp-surface1">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer ${
              i18nInstance.language === lang.code
                ? "bg-ctp-surface0 text-ctp-text"
                : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"
            }`}
          >
            {lang.name}
            {i18nInstance.language === lang.code && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

