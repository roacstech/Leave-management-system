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
            System Themes
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Select your preferred color scheme. The chosen theme applies instantly across your dashboard.
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
              <Sparkles className="w-3 h-3" />
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
              Light
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
              Dark
            </span>
          </button>
        </div>
      </div>

      {/* Themes Grid Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredThemes.map((t: ThemeOption) => {
          const isSelected = currentTheme === t.id;

          return (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`group relative rounded-2xl border-2 p-3 transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                isSelected
                  ? "border-primary bg-base-100 shadow-md ring-2 ring-primary/20 scale-[1.02]"
                  : "border-base-300 bg-base-100 hover:border-primary/50 hover:shadow-xs"
              }`}
            >
              {/* Theme Name & Selected Badge */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-base-content truncate capitalize">
                  {t.name}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* DaisyUI Color Swatches Box (Matches your screenshot) */}
              <div
                data-theme={t.id}
                className="bg-base-100 text-base-content rounded-xl p-2 border border-base-content/10 shadow-2xs space-y-1.5"
              >
                <div className="grid grid-cols-4 gap-1">
                  <div
                    style={{ backgroundColor: t.primary }}
                    className="h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-2xs"
                  >
                    A
                  </div>
                  <div
                    style={{ backgroundColor: t.secondary }}
                    className="h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-2xs"
                  >
                    A
                  </div>
                  <div
                    style={{ backgroundColor: t.accent }}
                    className="h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-2xs"
                  >
                    A
                  </div>
                  <div
                    style={{ backgroundColor: t.neutral }}
                    className="h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-2xs"
                  >
                    A
                  </div>
                </div>

                <div className="h-2 rounded-sm bg-base-200 w-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}