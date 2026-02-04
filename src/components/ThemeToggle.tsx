import { Sparkles, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="gap-2"
    >
      {theme === "casino" ? (
        <>
          <Wine className="w-4 h-4" />
          <span className="hidden sm:inline">Dive Vegas</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Classic Casino</span>
        </>
      )}
    </Button>
  );
}
