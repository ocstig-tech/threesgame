import { useState, useEffect } from "react";

export type ThemeOption = "casino" | "dive-vegas";

const THEME_KEY = "threes_theme";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeOption>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_KEY) as ThemeOption) || "casino";
    }
    return "casino";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("theme-dive-vegas");
    
    // Apply theme class
    if (theme === "dive-vegas") {
      root.classList.add("theme-dive-vegas");
    }
    
    // Persist choice
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "casino" ? "dive-vegas" : "casino"));
  };

  return { theme, setTheme, toggleTheme };
}
