"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  Users,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface TeamComparisonItem {
  id: number;
  name: string;
  teamLead: string;
  leadEmail: string;
  headcount: number;
  totalLeaveDays: number;
  avgLeavePerMember: number;
  attendanceRate: number;
  lateRate: number;
  totalOtHours: number;
  totalCompOffDays: number;
}

export default function CEOTeamReportsPage() {
  const [teams, setTeams] = useState<TeamComparisonItem[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchTeamReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ceo/reports/teams");
      const json = await res.json();
      if (json.success) {
        setTeams(json.teamComparisons || []);
        if (json.currentYear) setCurrentYear(json.currentYear);
      }
    } catch {
      console.error("Failed to load cross-team report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamReports();
  }, []);

  // Top Performers
  const highestAttendance = teams.length > 0
    ? [...teams].sort((a, b) => b.attendanceRate - a.attendanceRate)[0]
    : null;

  const highestOT = teams.length > 0
    ? [...teams].sort((a, b) => b.totalOtHours - a.totalOtHours)[0]
    : null;

  const largestTeam = teams.length > 0
    ? [...teams].sort((a, b) => b.headcount - a.headcount)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Cross-Department Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Cross-Team Performance & Benchmarking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare presence fidelity, absenteeism rates, leave consumption, and overtime hours across operational units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
            Fiscal Year {currentYear}
          </div>
        </div>
      </div>

      {/* 2. Top Performers Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Highest Attendance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Top Attendance Fidelity
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {highestAttendance ? highestAttendance.name : "--"}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {highestAttendance ? `${highestAttendance.attendanceRate}% Average Presence` : "--"}
            </div>
          </div>
        </div>

        {/* Highest Overtime Support */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Highest OT Output
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {highestOT ? highestOT.name : "--"}
            </div>
            <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
              {highestOT ? `${highestOT.totalOtHours} hrs OT Logged` : "--"}
            </div>
          </div>
        </div>

        {/* Largest Department */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Largest Business Unit
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {largestTeam ? largestTeam.name : "--"}
            </div>
            <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
              {largestTeam ? `${largestTeam.headcount} Active Members` : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cross-Team Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Team Benchmarking Roster ({teams.length} Units)
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading cross-team analytics...</div>
        ) : teams.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No teams registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Team / Department</th>
                  <th className="py-3 px-4">Lead Supervisor</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4">Late Arrivals %</th>
                  <th className="py-3 px-4">Total Leave Days</th>
                  <th className="py-3 px-4">Avg / Member</th>
                  <th className="py-3 px-4">Overtime Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{t.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-semibold text-slate-900">{t.teamLead}</div>
                      <div className="text-[10px] text-slate-400">{t.leadEmail}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {t.headcount} Staff
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">{t.attendanceRate}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.max(5, t.attendanceRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                        {t.lateRate}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {t.totalLeaveDays} Days
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {t.avgLeavePerMember} Days
                    </td>

                    <td className="py-3.5 px-4 font-bold text-indigo-700">
                      {t.totalOtHours} hrs ({t.totalCompOffDays}d Comp-Off)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
