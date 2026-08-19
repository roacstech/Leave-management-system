"use client";

import React, { useEffect, useState } from "react";
import { CalendarCheck2, Check, X, Calendar, User } from "lucide-react";

export default function LeavesAdminPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalState, setModalState] = useState<{ isOpen: boolean, type: "APPROVE" | "REJECT" | null, requestId: number | null }>({ isOpen: false, type: null, requestId: null });
  const [rejectReason, setRejectReason] = useState("");

  const loadLeaves = () => {
    setLoading(true);
    fetch(`/api/admin/leaves?status=${filter}&page=${page}&limit=10`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLeaves(data.leaveRequests || []);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.totalItems);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeaves();
  }, [filter, page]);

  const openModal = (type: "APPROVE" | "REJECT", id: number) => {
    setModalState({ isOpen: true, type, requestId: id });
    setRejectReason("");
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, requestId: null });
    setRejectReason("");
  };

  const confirmAction = async () => {
    if (!modalState.requestId || !modalState.type) return;

    const id = modalState.requestId;
    const status = modalState.type === "APPROVE" ? "APPROVED" : "REJECTED";
    
    const body: any = { id, status };
    if (status === "REJECTED") {
      body.rejectionReason = rejectReason;
    }

    const res = await fetch("/api/admin/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      loadLeaves();
      closeModal();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Leave Requests Master
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review, approve, or reject employee leave applications with Prisma updates.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => { setFilter(st); setPage(1); }}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4 text-center">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No {filter.toLowerCase()} leave requests</p>
                  </td>
                </tr>
              ) : (
                leaves.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{req.user.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                        {req.user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 whitespace-nowrap">
                        {req.leaveType.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 whitespace-nowrap">
                        {new Date(req.startDate).toLocaleDateString()} to {new Date(req.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      {req.reason ? (
                        <p className="text-xs text-slate-500 truncate" title={req.reason}>"{req.reason}"</p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {req.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => openModal("APPROVE", req.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => openModal("REJECT", req.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-slate-200/80 rounded-b-2xl">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span> to{" "}
            <span className="font-medium">{Math.min(page * 10, totalItems)}</span> of{" "}
            <span className="font-medium">{totalItems}</span> leaves
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt; Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === p
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-slate-900">
              {modalState.type === "APPROVE" ? "Confirm Approval" : "Reject Leave Request"}
            </h2>
            <p className="text-sm text-slate-600">
              {modalState.type === "APPROVE"
                ? "Are you sure you want to approve this leave request?"
                : "Please provide a reason for rejecting this leave request."}
            </p>

            {modalState.type === "REJECT" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={modalState.type === "REJECT" && !rejectReason.trim()}
                className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  modalState.type === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {modalState.type === "APPROVE" ? "Yes, Approve" : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
