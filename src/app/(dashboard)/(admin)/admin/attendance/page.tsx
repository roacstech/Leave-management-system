"use client";

import React, { useEffect, useState } from "react";
import { Clock3, Calendar, Search } from "lucide-react";

export default function AttendanceAdminPage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/attendance")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAttendances(data.attendances || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = attendances.filter((a) => filter === "ALL" || a.status.toUpperCase() === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Daily Attendance Master
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track staff check-in, check-out, and daily attendance records.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium">
          {["ALL", "PRESENT", "LATE", "HALF_DAY", "ABSENT"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === st
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No attendance records found</p>
            </div>
          ) : (
            filtered.map((att) => (
              <div
                key={att.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {att.user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{att.user.name}</div>
                    <div className="text-xs text-slate-500">
                      {att.user.email} {att.user.team ? `• ${att.user.team.name}` : ""}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      att.status === "PRESENT" || att.status === "ON_TIME"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : att.status === "LATE"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {att.status}
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    In: {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
