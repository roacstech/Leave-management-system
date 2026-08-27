"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Loader2, CalendarDays, Clock, CheckCircle2 } from "lucide-react";

export default function EmployeeHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<"ALL" | "UPCOMING" | "PAST">("UPCOMING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchHolidays = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status: filterStatus,
      });

      const res = await fetch(`/api/admin/holidays?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalFiltered ?? data.pagination.total ?? 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch company holidays", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDayString = (fromStr: string, toStr: string) => {
    if (!fromStr) return "";
    const fromDate = new Date(fromStr);
    const fromDay = fromDate.toLocaleDateString("en-US", { weekday: "long" });

    if (!toStr) return fromDay;

    const toDate = new Date(toStr);
    const toDay = toDate.toLocaleDateString("en-US", { weekday: "long" });

    const isSameDay =
      fromDate.getFullYear() === toDate.getFullYear() &&
      fromDate.getMonth() === toDate.getMonth() &&
      fromDate.getDate() === toDate.getDate();

    if (isSameDay || fromDay === toDay) {
      return fromDay;
    }

    return `${fromDay} – ${toDay}`;
  };

  const isHolidayUpcoming = (toDateStr: string) => {
    if (!toDateStr) return false;
    const end = new Date(toDateStr);
    end.setHours(23, 59, 59, 999);
    return end >= new Date();
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>Company Holidays</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official public holidays and company observances for {new Date().getFullYear()}
          </p>
        </div>

        {/* Filter Tabs in Top Card */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 text-xs self-start sm:self-auto">
          <button
            onClick={() => {
              setFilterStatus("ALL");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
              filterStatus === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setFilterStatus("UPCOMING");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
              filterStatus === "UPCOMING"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => {
              setFilterStatus("PAST");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
              filterStatus === "PAST"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* 2. HOLIDAYS TABLE UI */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs relative">
        <div className="overflow-x-auto min-h-[220px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-xs">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Holiday Name</th>
                <th className="py-3.5 px-4">From Date</th>
                <th className="py-3.5 px-4">To Date</th>
                <th className="py-3.5 px-4">Day</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {!isLoading && holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No company holidays found for the selected filter.
                  </td>
                </tr>
              ) : (
                holidays.map((h) => {
                  const isUpcoming = isHolidayUpcoming(h.toDate || h.fromDate);
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {h.name}
                            </div>
                            {h.description && (
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {h.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.fromDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.toDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 whitespace-nowrap">
                          {formatDayString(h.fromDate, h.toDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isUpcoming ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Upcoming</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>Past</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 border-t border-slate-200/80 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span> to{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * 10, totalItems)}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> holidays
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    page === p
                      ? "bg-indigo-600 text-white font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
