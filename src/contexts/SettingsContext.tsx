"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  SystemSettingsData,
  DEFAULT_SYSTEM_SETTINGS,
  formatDateWithPattern,
  formatTimeWithSettings,
  formatDateTimeWithSettings,
} from "@/lib/settings-client";

interface SettingsContextType {
  settings: SystemSettingsData;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateLocalSettings: (partial: Partial<SystemSettingsData>) => void;
  formatDate: (date: Date | string | number | null | undefined) => string;
  formatTime: (date: Date | string | number | null | undefined) => string;
  formatDateTime: (date: Date | string | number | null | undefined) => string;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SYSTEM_SETTINGS,
  loading: true,
  refreshSettings: async () => {},
  updateLocalSettings: () => {},
  formatDate: (d) => formatDateWithPattern(d, "DD/MM/YYYY", "Asia/Kolkata"),
  formatTime: (d) => formatTimeWithSettings(d, "Asia/Kolkata"),
  formatDateTime: (d) => formatDateTimeWithSettings(d, "DD/MM/YYYY", "Asia/Kolkata"),
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettingsData>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.warn("Could not load settings in client context:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateLocalSettings = useCallback((partial: Partial<SystemSettingsData>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const formatDate = useCallback(
    (date: Date | string | number | null | undefined) => {
      return formatDateWithPattern(date, settings.dateFormat, settings.timezone);
    },
    [settings.dateFormat, settings.timezone]
  );

  const formatTime = useCallback(
    (date: Date | string | number | null | undefined) => {
      return formatTimeWithSettings(date, settings.timezone);
    },
    [settings.timezone]
  );

  const formatDateTime = useCallback(
    (date: Date | string | number | null | undefined) => {
      return formatDateTimeWithSettings(date, settings.dateFormat, settings.timezone);
    },
    [settings.dateFormat, settings.timezone]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
        updateLocalSettings,
        formatDate,
        formatTime,
        formatDateTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
