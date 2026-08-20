"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Sparkles,
  Calendar,
  Search,
  Building2,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface HolidayItem {
  id: number;
  name: string;
  date: string;
  fromDate: string;
  toDate: string;
  durationDays: number;
  quarter: string;
  description: string | null;
}

interface HolidaySummary {
  totalHolidays: number;
  totalHolidayDays: number;
  q1Count: number;
  q2Count: number;
  q3Count: number;
  q4Count: number;
}

export default function CEOHolidaysPage() {
  const { formatDate } = useSettings();
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [summary, setSummary] = useState<HolidaySummary>({
    totalHolidays: 0,
    totalHolidayDays: 0,
    q1Count: 0,
    q2Count: 0,
    q3Count: 0,
    q4Count: 0,
  });
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("ALL");

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ceo/holidays");
      const json = await res.json();
      if (json.success) {
        setHolidays(json.holidays || []);
        if (json.summary) setSummary(json.summary);
        if (json.currentYear) setCurrentYear(json.currentYear);
      }
    } catch {
      console.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const filteredHolidays = holidays.filter((h) => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase());
    const matchQuarter = quarterFilter === "ALL" || h.quarter === quarterFilter;
    return matchSearch && matchQuarter;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Official Company Roster</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Corporate Public Holidays Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official paid non-working days and statutory company closures for Year {currentYear}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
            Year {currentYear}
          </div>
        </div>
      </div>

      {/* 2. Macro Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Holidays
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{loading ? "--" : summary.totalHolidays}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Official celebrations</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Days Off
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-emerald-700">
              {loading ? "--" : `${summary.totalHolidayDays} Days`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Paid statutory leave</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              H1 Distribution
            </span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.q1Count + summary.q2Count}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Q1 ({summary.q1Count}) + Q2 ({summary.q2Count})</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              H2 Distribution
            </span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">
              {loading ? "--" : summary.q3Count + summary.q4Count}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Q3 ({summary.q3Count}) + Q4 ({summary.q4Count})</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search holiday name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {["ALL", "Q1", "Q2", "Q3", "Q4"].map((q) => (
            <button
              key={q}
              onClick={() => setQuarterFilter(q)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                quarterFilter === q
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {q === "ALL" ? "All Quarters" : q}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Holiday Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">
            Loading holiday schedule...
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No public holidays found</p>
          </div>
        ) : (
          filteredHolidays.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                    {h.quarter}
                  </span>

                  <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {h.durationDays} Day{h.durationDays > 1 ? "s" : ""} Closure
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {h.durationDays > 1
                        ? `${formatDate(h.fromDate)} to ${formatDate(h.toDate)}`
                        : formatDate(h.date)}
                    </span>
                  </p>
                </div>

                {h.description && (
                  <p className="text-[11px] text-slate-400 italic">
                    "{h.description}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Statutory Holiday</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
