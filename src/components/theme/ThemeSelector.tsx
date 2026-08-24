"use client";

import React, { useState } from "react";
import { useTheme, AVAILABLE_THEMES, ThemeOption } from "@/contexts/ThemeContext";
import { Check, Palette, Sun, Moon, Sparkles } from "lucide-react";

export default function ThemeSelector() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [filter, setFilter] = useState<"all" | "light" | "dark">("all");

  const filteredThemes = AVAILABLE_THEMES.filter((t) => {
    if (filter === "light") return t.type === "light";
    if (filter === "dark") return t.type === "dark";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-base-300">
        <div>
          <h2 className="text-base font-bold text-base-content flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span>Theme & Visual Identity</span>
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Select your preferred color theme ({AVAILABLE_THEMES.length} enterprise options available).
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-base-200 p-1 rounded-xl border border-base-300 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              All ({AVAILABLE_THEMES.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("light")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === "light"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-amber-500" />
              Light ({AVAILABLE_THEMES.filter((t) => t.type === "light").length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("dark")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === "dark"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Moon className="w-3 h-3 text-indigo-400" />
              Dark ({AVAILABLE_THEMES.filter((t) => t.type === "dark").length})
            </span>
          </button>
        </div>
      </div>

      {/* Clean Theme Cards (Name + Exact Theme Swatch + Active Indicator) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
        {filteredThemes.map((t: ThemeOption) => {
          const isSelected = currentTheme === t.id;

          return (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-primary ring-2 ring-primary/25 bg-base-100 shadow-sm"
                  : "border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200/50"
              }`}
            >
              {/* Left: Swatch (uses exact theme primary color) + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div data-theme={t.id} className="shrink-0 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-primary ring-2 ring-base-300/80 shadow-2xs" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-base-content truncate">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium">
                    {t.type} theme
                  </div>
                </div>
              </div>

              {/* Right: Active Check or Radio */}
              <div>
                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-base-300 group-hover:border-primary/50 transition-colors block" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}