"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ThemeOption {
  id: string;
  name: string;
  type: "light" | "dark";
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  // ─── Light Themes ───
  { id: "light", name: "Light (Default)", type: "light", primary: "#4f46e5", secondary: "#7c3aed", accent: "#06b6d4", neutral: "#1f2937" },
  { id: "corporate", name: "Corporate", type: "light", primary: "#4b6bfb", secondary: "#7b92b2", accent: "#67cba0", neutral: "#181a2a" },
  { id: "emerald", name: "Emerald", type: "light", primary: "#66cc8a", secondary: "#377cfb", accent: "#ea5234", neutral: "#333c4d" },
  { id: "cupcake", name: "Cupcake", type: "light", primary: "#65c3c8", secondary: "#ef9fbc", accent: "#eeaf3a", neutral: "#291334" },
  { id: "garden", name: "Garden", type: "light", primary: "#e9e7e7", secondary: "#e779c1", accent: "#5c7f67", neutral: "#291e00" },
  { id: "lofi", name: "Lo-Fi", type: "light", primary: "#0d0d0d", secondary: "#1a1919", accent: "#262626", neutral: "#000000" },
  { id: "pastel", name: "Pastel", type: "light", primary: "#d1c1d7", secondary: "#f6cbd1", accent: "#b4e9d6", neutral: "#70acc7" },
  { id: "fantasy", name: "Fantasy", type: "light", primary: "#6e0b75", secondary: "#007ebd", accent: "#f8860d", neutral: "#1f2937" },
  { id: "wireframe", name: "Wireframe", type: "light", primary: "#b8b8b8", secondary: "#b8b8b8", accent: "#b8b8b8", neutral: "#000000" },
  { id: "cmyk", name: "CMYK", type: "light", primary: "#45AEEE", secondary: "#E8488A", accent: "#FFF232", neutral: "#1A1A1A" },
  { id: "autumn", name: "Autumn", type: "light", primary: "#8C0327", secondary: "#D85251", accent: "#D59B6A", neutral: "#826A5C" },
  { id: "acid", name: "Acid", type: "light", primary: "#FF00F4", secondary: "#FF7400", accent: "#CBFD03", neutral: "#190D27" },
  { id: "lemonade", name: "Lemonade", type: "light", primary: "#519903", secondary: "#E9E92F", accent: "#DFF44D", neutral: "#191A3E" },
  { id: "winter", name: "Winter", type: "light", primary: "#047AFF", secondary: "#463AA2", accent: "#C148AC", neutral: "#021431" },
  { id: "nord", name: "Nord", type: "light", primary: "#5E81AC", secondary: "#81A1C1", accent: "#88C0D0", neutral: "#2E3440" },
  { id: "caramellatte", name: "Caramel Latte", type: "light", primary: "#B35300", secondary: "#E59866", accent: "#FAD7A0", neutral: "#4A235A" },
  { id: "silk", name: "Silk", type: "light", primary: "#0E7490", secondary: "#F43F5E", accent: "#FB923C", neutral: "#1E293B" },

  // ─── Dark Themes ───
  { id: "dark", name: "Dark (Default)", type: "dark", primary: "#661AE6", secondary: "#D926AA", accent: "#1FB2A5", neutral: "#191D24" },
  { id: "synthwave", name: "Synthwave", type: "dark", primary: "#e779c1", secondary: "#58c7f3", accent: "#f3cc30", neutral: "#20134e" },
  { id: "halloween", name: "Halloween", type: "dark", primary: "#f28c18", secondary: "#6d3a9c", accent: "#51a800", neutral: "#1b1d1d" },
  { id: "forest", name: "Forest", type: "dark", primary: "#1eb854", secondary: "#1fd65f", accent: "#d99330", neutral: "#110e0e" },
  { id: "aqua", name: "Aqua", type: "dark", primary: "#09ecf3", secondary: "#966fb3", accent: "#ffe999", neutral: "#3b8ac4" },
  { id: "black", name: "Black", type: "dark", primary: "#343232", secondary: "#343232", accent: "#343232", neutral: "#000000" },
  { id: "luxury", name: "Luxury", type: "dark", primary: "#ffffff", secondary: "#152747", accent: "#513448", neutral: "#09090b" },
  { id: "dracula", name: "Dracula", type: "dark", primary: "#ff79c6", secondary: "#bd93f9", accent: "#ffb86c", neutral: "#414558" },
  { id: "business", name: "Business", type: "dark", primary: "#1C4E80", secondary: "#7C909A", accent: "#EA6947", neutral: "#202020" },
  { id: "night", name: "Night", type: "dark", primary: "#38bdf8", secondary: "#818cf8", accent: "#f472b6", neutral: "#1e293b" },
  { id: "coffee", name: "Coffee", type: "dark", primary: "#DB924B", secondary: "#263E3F", accent: "#10576D", neutral: "#120C12" },
  { id: "dim", name: "Dim", type: "dark", primary: "#9FE88D", secondary: "#FF7D5C", accent: "#C792EA", neutral: "#2A303C" },
  { id: "sunset", name: "Sunset", type: "dark", primary: "#FF865B", secondary: "#FD6F96", accent: "#FFBE53", neutral: "#1A102F" },
  { id: "abyss", name: "Abyss", type: "dark", primary: "#3B82F6", secondary: "#6366F1", accent: "#8B5CF6", neutral: "#0B0F19" }
];

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
    const saved = localStorage.getItem("lms-theme") || "light";
    setCurrentTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  const changeTheme = (newTheme: string) => {
    setCurrentTheme(newTheme);
    localStorage.setItem("lms-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
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