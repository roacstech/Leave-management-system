"use client";

import React from "react";
import {
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  TrendingUp,
  Clock,
} from "lucide-react";

export default function CEODashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30 mb-2">
            <span>Executive Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            CEO Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Welcome to the executive portal. Monitor company-wide workforce presence, leave allocations, and departmental health.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
            <span className="text-slate-300">System Status:</span>{" "}
            <span className="font-semibold text-emerald-400">● Operational</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </p>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">--</p>
          <p className="mt-1 text-[11px] text-slate-400">All registered staff members</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Departments & Teams
            </p>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">--</p>
          <p className="mt-1 text-[11px] text-slate-400">Active organizational units</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              On Leave Today
            </p>
            <CalendarCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
          <p className="mt-1 text-[11px] text-amber-600 font-medium">Approved leaves active today</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </p>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">--%</p>
          <p className="mt-1 text-[11px] text-slate-400">Today's workforce presence</p>
        </div>
      </div>

      {/* Overview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Departmental Distribution
              </h2>
            </div>
          </div>
          <div className="p-8 text-center text-xs text-slate-400">
            No departmental analytics data available.
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Recent Executive Notices
              </h2>
            </div>
          </div>
          <div className="p-8 text-center text-xs text-slate-400">
            No active notices or urgent escalations.
          </div>
        </div>
      </div>
    </div>
  );
}
