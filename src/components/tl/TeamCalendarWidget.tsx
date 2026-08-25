"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface LeaveEvent {
  id: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "APPROVED" | "PENDING_TL" | "PENDING_ADMIN" | "REJECTED" | "CANCELLED";
}

export default function TeamCalendarWidget() {
  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch(`/api/tl/calendar?month=${month + 1}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error("Error loading team calendar:", err);
    }
  }, [month, year]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Navigation Handlers
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const handleTodayJump = () => {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setSelectedDate(today);
  };

  // Calendar calculations
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  // Build map of leaves by date key
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveEvent[]>();

    leaves.forEach((req) => {
      const s = new Date(req.startDate);
      const e = new Date(req.endDate);

      const cur = new Date(s);
      while (cur <= e) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(req);
        cur.setDate(cur.getDate() + 1);
      }
    });

    return map;
  }, [leaves]);

  return (
    <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span>{monthName}</span>
        </h3>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-200/70 text-slate-600 rounded transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTodayJump}
            className="px-2 py-0.5 text-[11px] font-semibold hover:bg-slate-200/70 text-slate-700 rounded transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-200/70 text-slate-600 rounded transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs pt-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-[11px] font-bold text-slate-400 py-1">
            {day}
          </div>
        ))}

        {/* Empty slots for previous month offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="py-1.5 text-slate-300">
            &nbsp;
          </div>
        ))}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateObj = new Date(year, month, dayNum);
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDateKey;
          const staffLeaves = leavesByDate.get(dateKey) || [];
          const leaveCount = staffLeaves.length;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => setSelectedDate(dateObj)}
              className={`py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-2xs"
                  : isToday
                  ? "border border-indigo-600 text-indigo-700 font-bold bg-indigo-50/60"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-xs leading-none">{dayNum}</span>
              {leaveCount > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? "bg-white" : "bg-indigo-600"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md bg-indigo-600 inline-block" />
          <span className="text-[11px] font-medium">Selected Date</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
          <span className="text-[11px] font-medium">Scheduled Leave</span>
        </div>
      </div>
    </div>
  );
}
