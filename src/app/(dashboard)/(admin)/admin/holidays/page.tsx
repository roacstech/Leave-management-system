"use client";

import React from "react";
import { Calendar } from "lucide-react";

export default function HolidaysPage() {
  const holidays = [
    { name: "New Year's Day", date: "Jan 1, 2026", day: "Thursday" },
    { name: "Republic Day", date: "Jan 26, 2026", day: "Monday" },
    { name: "Holi Festival", date: "Mar 17, 2026", day: "Tuesday" },
    { name: "Independence Day", date: "Aug 15, 2026", day: "Saturday" },
    { name: "Gandhi Jayanti", date: "Oct 2, 2026", day: "Friday" },
    { name: "Diwali Festival", date: "Nov 8, 2026", day: "Sunday" },
    { name: "Christmas Day", date: "Dec 25, 2026", day: "Friday" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Company Holidays Calendar
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Official company holiday schedule and non-working days.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.map((h) => (
          <div key={h.name} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">{h.name}</div>
              <div className="text-xs text-indigo-600 font-medium">{h.date} • {h.day}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
