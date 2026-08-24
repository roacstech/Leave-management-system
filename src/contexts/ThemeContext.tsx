"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ThemeOption {
  id: string;
  name: string;
  type: "light" | "dark";
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  // ─── Light Themes (17) ───
  { id: "light", name: "Default Light", type: "light" },
  { id: "corporate", name: "Corporate Blue", type: "light" },
  { id: "emerald", name: "Emerald Green", type: "light" },
  { id: "cupcake", name: "Pastel Teal", type: "light" },
  { id: "garden", name: "Botanical Rose", type: "light" },
  { id: "lofi", name: "Clean Monochrome", type: "light" },
  { id: "pastel", name: "Soft Pastel", type: "light" },
  { id: "fantasy", name: "Royal Purple", type: "light" },
  { id: "wireframe", name: "Minimal Wireframe", type: "light" },
  { id: "cmyk", name: "Cyan Focus", type: "light" },
  { id: "autumn", name: "Autumn Crimson", type: "light" },
  { id: "acid", name: "Vibrant Magenta", type: "light" },
  { id: "lemonade", name: "Lime Fresh", type: "light" },
  { id: "winter", name: "Winter Frost", type: "light" },
  { id: "nord", name: "Nordic Slate", type: "light" },
  { id: "caramellatte", name: "Caramel Luxe", type: "light" },
  { id: "silk", name: "Silk Executive", type: "light" },

  // ─── Dark Themes (14) ───
  { id: "dark", name: "Default Dark", type: "dark" },
  { id: "synthwave", name: "Cyber Neon", type: "dark" },
  { id: "halloween", name: "Amber Halloween", type: "dark" },
  { id: "forest", name: "Midnight Forest", type: "dark" },
  { id: "aqua", name: "Oceanic Aqua", type: "dark" },
  { id: "black", name: "Obsidian Black", type: "dark" },
  { id: "luxury", name: "Gold Luxury", type: "dark" },
  { id: "dracula", name: "Velvet Dracula", type: "dark" },
  { id: "business", name: "Deep Navy Business", type: "dark" },
  { id: "night", name: "Pro Night Sky", type: "dark" },
  { id: "coffee", name: "Espresso Coffee", type: "dark" },
  { id: "dim", name: "Dim Slate", type: "dark" },
  { id: "sunset", name: "Sunset Glow", type: "dark" },
  { id: "abyss", name: "Deep Abyss", type: "dark" },
];

const THEME_MIGRATION_MAP: Record<string, string> = {
  indigo: "light",
  "midnight-emerald": "forest",
  "deep-sapphire": "business",
  "velvet-night": "dracula",
  "cyber-matrix": "synthwave",
  "pro-graphite": "night",
  obsidian: "dark",
  mono: "lofi",
  nordic: "nord",
  amber: "retro",
  teal: "aqua",
  crimson: "autumn",
  amethyst: "fantasy",
};

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  availableThemes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setCurrentTheme] = useState<string>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Load saved theme from localStorage on initial render
    const rawSaved = localStorage.getItem("lms-theme") || "light";
    const normalized = THEME_MIGRATION_MAP[rawSaved] || rawSaved;
    
    // Verify it exists in available themes, fallback to light if not
    const exists = AVAILABLE_THEMES.some((t) => t.id === normalized);
    const validTheme = exists ? normalized : "light";

    setCurrentTheme(validTheme);
    localStorage.setItem("lms-theme", validTheme);
    document.documentElement.setAttribute("data-theme", validTheme);
    setMounted(true);
  }, []);

  const changeTheme = (newTheme: string) => {
    const normalized = THEME_MIGRATION_MAP[newTheme] || newTheme;
    setCurrentTheme(normalized);
    localStorage.setItem("lms-theme", normalized);
    document.documentElement.setAttribute("data-theme", normalized);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: changeTheme,
        availableThemes: AVAILABLE_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}