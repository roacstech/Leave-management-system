"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
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

export default function CEOHolidaysPage() {
  const { formatDate } = useSettings();
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ceo/holidays");
      const json = await res.json();
      if (json.success) {
        setHolidays(json.holidays || []);
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

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchSearch = h.name.toLowerCase().includes(search.toLowerCase());
      const matchQuarter = quarterFilter === "ALL" || h.quarter === quarterFilter;
      return matchSearch && matchQuarter;
    });
  }, [holidays, search, quarterFilter]);

  const totalItems = filteredHolidays.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedHolidays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHolidays.slice(start, start + pageSize);
  }, [filteredHolidays, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <CalendarDays className="w-3 h-3" />
              <span>Official Company Roster</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Corporate Public Holidays Calendar
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official paid non-working days and statutory company closures for Year {currentYear}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs shadow-2xs">
              Year {currentYear}
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search holiday name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {["ALL", "Q1", "Q2", "Q3", "Q4"].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuarterFilter(q);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  quarterFilter === q
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. HOLIDAYS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading holiday schedule...</div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No holidays found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Calendar Date</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Quarter</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedHolidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{h.name}</div>
                      {h.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{h.description}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{formatDate(h.date)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {h.durationDays > 1 ? (
                        <span>
                          {formatDate(h.fromDate)} — {formatDate(h.toDate)}
                        </span>
                      ) : (
                        <span>Single Day</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {h.quarter}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {h.durationDays} {h.durationDays === 1 ? "day" : "days"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-indigo-600 text-white shadow-2xs font-bold"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                return (
                  <span key={pageNumber} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
