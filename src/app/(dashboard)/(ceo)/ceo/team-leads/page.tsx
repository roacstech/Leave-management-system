"use client";

import React, { useEffect, useState } from "react";
import {
  UserCheck,
  Building2,
  Users,
  Search,
  CheckCircle2,
  TrendingUp,
  Clock,
  ChevronRight,
  Eye,
  X,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";

interface TeamLeadItem {
  id: number;
  name: string;
  email: string;
  role: string;
  teamId: number | null;
  teamName: string;
  teamSize: number;
  pendingLeavesCount: number;
  attendanceRate: number;
  members: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  }>;
}

export default function CEOTeamLeadsPage() {
  const [teamLeads, setTeamLeads] = useState<TeamLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTL, setSelectedTL] = useState<TeamLeadItem | null>(null);

  const fetchTeamLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ceo/team-leads");
      const json = await res.json();
      if (json.success) {
        setTeamLeads(json.teamLeads || []);
      }
    } catch {
      console.error("Failed to load team leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamLeads();
  }, []);

  const filteredTLs = teamLeads.filter(
    (tl) =>
      tl.name.toLowerCase().includes(search.toLowerCase()) ||
      tl.email.toLowerCase().includes(search.toLowerCase()) ||
      tl.teamName.toLowerCase().includes(search.toLowerCase())
  );

  const totalReports = teamLeads.reduce((acc, curr) => acc + curr.teamSize, 0);
  const totalPending = teamLeads.reduce((acc, curr) => acc + curr.pendingLeavesCount, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 mb-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Organizational Leadership</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Team Leads & Functional Units
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor supervisory oversight, team coverage metrics, and team-level approval turnaround.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>{teamLeads.length} Team Leaders</span>
          </div>
        </div>
      </div>

      {/* 2. Macro KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Team Leads
            </span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{teamLeads.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Assigned supervisors</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Direct Reports
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{totalReports}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Assigned team members</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending TL Leaves
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">{totalPending}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting TL sign-off</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Leadership Coverage
            </span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900">100%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">All teams assigned</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by TL name, email, or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* 4. Team Leads Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">
            Loading Team Leads directory...
          </div>
        ) : filteredTLs.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No Team Leads match your search</p>
          </div>
        ) : (
          filteredTLs.map((tl) => (
            <div
              key={tl.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* TL Profile */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {tl.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{tl.name}</h3>
                      <p className="text-[11px] text-slate-400">{tl.email}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                    {tl.role}
                  </span>
                </div>

                {/* Team Tag */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Assigned Team:</span>
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{tl.teamName}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Team Headcount:</span>
                    <span className="font-semibold text-slate-900">{tl.teamSize} Members</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Pending Approvals:</span>
                    <span className="font-bold text-amber-600">{tl.pendingLeavesCount} Pending</span>
                  </div>
                </div>

                {/* Presence Gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Today's Team Presence:</span>
                    <span className="font-bold text-emerald-600">{tl.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.max(5, tl.attendanceRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {tl.members.length} direct reports
                </span>

                <button
                  onClick={() => setSelectedTL(tl)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inspect Team</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Team Expansion Modal */}
      {selectedTL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  {selectedTL.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedTL.teamName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lead: {selectedTL.name} ({selectedTL.email})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTL(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned Team Members ({selectedTL.members.length})</span>
              </h4>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                {selectedTL.members.length === 0 ? (
                  <p className="p-4 text-slate-400 italic text-center">No members assigned to this team.</p>
                ) : (
                  selectedTL.members.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.email}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {m.role}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === "PRESENT" || m.status === "ON_TIME"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.status === "ON_LEAVE"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedTL(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
