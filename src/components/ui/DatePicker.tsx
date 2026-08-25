"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  disableSundays?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  align?: "left" | "right";
  size?: "xs" | "sm" | "md";
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseISODate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatToISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disableSundays = false,
  placeholder = "Select date",
  label,
  required = false,
  disabled = false,
  className = "",
  error,
  align = "left",
  size = "xs",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDateObj = parseISODate(value);
  const initialDate = selectedDateObj || parseISODate(minDate || "") || new Date();

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const parsed = parseISODate(value);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    } else if (minDate) {
      const parsed = parseISODate(minDate);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }, [value, minDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleScrollOutside(event: Event) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOutside, { capture: true, passive: true });
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOutside, { capture: true });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDateObj = minDate ? parseISODate(minDate) : null;
  const maxDateObj = maxDate ? parseISODate(maxDate) : null;

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const daysGrid: Array<{
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isDisabled: boolean;
    isSelected: boolean;
    isToday: boolean;
    isSunday: boolean;
  }> = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(viewYear, viewMonth - 1, dayNum, 0, 0, 0, 0);
    daysGrid.push({
      date,
      dayNum,
      isCurrentMonth: false,
      isDisabled: true,
      isSelected: false,
      isToday: false,
      isSunday: date.getDay() === 0,
    });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = new Date(viewYear, viewMonth, dayNum, 0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDateObj ? date.getTime() === selectedDateObj.getTime() : false;
    const isSunday = date.getDay() === 0;

    let isDisabled = false;
    if (minDateObj && date.getTime() < minDateObj.getTime()) {
      isDisabled = true;
    }
    if (maxDateObj && date.getTime() > maxDateObj.getTime()) {
      isDisabled = true;
    }
    if (disableSundays && isSunday) {
      isDisabled = true;
    }

    daysGrid.push({
      date,
      dayNum,
      isCurrentMonth: true,
      isDisabled,
      isSelected,
      isToday,
      isSunday,
    });
  }

  const remaining = (7 - (daysGrid.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const date = new Date(viewYear, viewMonth + 1, dayNum, 0, 0, 0, 0);
    daysGrid.push({
      date,
      dayNum,
      isCurrentMonth: false,
      isDisabled: true,
      isSelected: false,
      isToday: false,
      isSunday: date.getDay() === 0,
    });
  }

  const handleSelectDate = (date: Date, isDisabled: boolean) => {
    if (isDisabled || disabled) return;
    const iso = formatToISODate(date);
    onChange(iso);
    setIsOpen(false);
  };

  const handleQuickToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (minDateObj && today.getTime() < minDateObj.getTime()) return;
    if (maxDateObj && today.getTime() > maxDateObj.getTime()) return;
    if (disableSundays && today.getDay() === 0) return;
    onChange(formatToISODate(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const formatDisplay = (iso: string) => {
    if (!iso) return placeholder;
    const d = parseISODate(iso);
    if (!d) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Clickable Input Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between rounded-xl border text-xs bg-slate-50 text-slate-900 cursor-pointer transition-all select-none shadow-2xs ${
          size === "xs" ? "px-3 py-1.5" : "px-3.5 py-2"
        } ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "border-indigo-500 ring-2 ring-indigo-500/10 bg-white"
            : error
            ? "border-rose-300 ring-2 ring-rose-500/10 bg-white"
            : "border-slate-200 hover:border-indigo-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`truncate ${value ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
            {formatDisplay(value)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
              title="Clear date"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}

      {/* Modern Popover Calendar */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-[100] w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{MONTH_NAMES[viewMonth]}</span>
              <span className="text-slate-400 font-medium">{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {WEEK_DAYS.map((day, idx) => (
              <div
                key={day}
                className={`text-[10px] font-bold py-1 ${
                  idx === 0 || idx === 6 ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((cell, idx) => {
              const isCellToday = cell.isToday;
              const isCellSelected = cell.isSelected;
              const isCellDisabled = cell.isDisabled;
              const isSunday = cell.date.getDay() === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isCellDisabled}
                  onClick={() => handleSelectDate(cell.date, isCellDisabled)}
                  className={`h-8 w-8 text-xs font-medium rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    isCellSelected
                      ? "bg-indigo-600 text-white font-bold shadow-2xs"
                      : isCellDisabled
                      ? "text-slate-300 bg-slate-50/50 cursor-not-allowed pointer-events-none opacity-40"
                      : isCellToday
                      ? "border border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 hover:bg-indigo-100/60"
                      : isSunday
                      ? "text-rose-500 hover:bg-rose-50 font-semibold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with Today Shortcut */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleQuickToday}
              disabled={Boolean(minDateObj && today.getTime() < minDateObj.getTime())}
              className="text-indigo-600 hover:text-indigo-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
