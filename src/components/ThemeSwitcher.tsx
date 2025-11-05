import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeSwitcher() {
  const { flavor, setFlavor } = useTheme();

  const flavors = [
    { id: "mocha" as const, name: "Mocha", emoji: "☕" },
    { id: "frappe" as const, name: "Frappe", emoji: "🥤" },
    { id: "macchiato" as const, name: "Macchiato", emoji: "☕" },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0"
          aria-label="Change theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-ctp-base border-ctp-surface1">
        {flavors.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onClick={() => setFlavor(f.id)}
            className={`cursor-pointer ${
              flavor === f.id
                ? "bg-ctp-surface0 text-ctp-text"
                : "text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text"
            }`}
          >
            <span className="mr-2">{f.emoji}</span>
            {f.name}
            {flavor === f.id && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

