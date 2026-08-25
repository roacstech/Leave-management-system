"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  UserCheck,
  Building2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock,
  TrendingUp,
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const filteredTLs = useMemo(() => {
    return teamLeads.filter(
      (tl) =>
        tl.name.toLowerCase().includes(search.toLowerCase()) ||
        tl.email.toLowerCase().includes(search.toLowerCase()) ||
        tl.teamName.toLowerCase().includes(search.toLowerCase())
    );
  }, [teamLeads, search]);

  const totalItems = filteredTLs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTLs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTLs.slice(start, start + pageSize);
  }, [filteredTLs, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* 1. UNIFIED PAGE HEADER & FILTER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold mb-1">
              <UserCheck className="w-3 h-3" />
              <span>Organizational Leadership</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Team Leads & Functional Units
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor supervisory oversight, team coverage metrics, and team-level approval turnaround.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs shadow-2xs flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{teamLeads.length} Team Leaders</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by lead name, email, or team..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 2. TEAM LEADS TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading team leads...</div>
        ) : filteredTLs.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-xs text-slate-700">No team leads found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Team Leader</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4">Direct Reports</th>
                  <th className="py-3 px-4">Pending Approvals</th>
                  <th className="py-3 px-4">Presence Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedTLs.map((tl) => (
                  <tr key={tl.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200 shrink-0">
                          {tl.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{tl.name}</div>
                          <div className="text-[11px] text-slate-400">{tl.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tl.teamName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tl.teamSize} Members</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {tl.pendingLeavesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>{tl.pendingLeavesCount} Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          All Clear
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{tl.attendanceRate}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${tl.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedTL(tl)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        Inspect Team
                      </button>
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

      {/* 3. TEAM INSPECTION MODAL */}
      {selectedTL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-200">
                  {selectedTL.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedTL.name}</h3>
                  <p className="text-xs text-slate-500">{selectedTL.teamName} Unit</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTL(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Size</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{selectedTL.teamSize}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Leaves</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{selectedTL.pendingLeavesCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Presence</span>
                  <span className="font-bold text-emerald-600 text-sm mt-0.5 block">{selectedTL.attendanceRate}%</span>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                  Assigned Team Members ({selectedTL.members.length})
                </h4>
                {selectedTL.members.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No team members assigned.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {selectedTL.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-400">{m.email}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.status === "On Leave"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTL(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
