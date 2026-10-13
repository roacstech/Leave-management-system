"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Power,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import ThemedSelect from "@/components/ui/ThemedSelect";

const CATEGORY_FILTER_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: "Annual", label: "Annual" },
  { value: "Casual", label: "Casual" },
  { value: "Sick", label: "Sick" },
  { value: "Maternity", label: "Maternity" },
  { value: "Paternity", label: "Paternity" },
  { value: "Compensatory", label: "Compensatory" },
  { value: "Other", label: "Other / Unpaid" },
];

const PAID_FILTER_OPTIONS = [
  { value: "ALL", label: "All Compensation" },
  { value: "PAID", label: "Paid Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
];

const CATEGORY_FORM_OPTIONS = [
  { value: "Annual", label: "Annual" },
  { value: "Casual", label: "Casual" },
  { value: "Sick", label: "Sick" },
  { value: "Maternity", label: "Maternity" },
  { value: "Paternity", label: "Paternity" },
  { value: "Compensatory", label: "Compensatory" },
  { value: "Other", label: "Other / Special" },
];

const PAID_OPTIONS = [
  { value: "true", label: "Paid Leave" },
  { value: "false", label: "Unpaid Leave" },
];

const ACTIVE_STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const CARRY_FORWARD_OPTIONS = [
  { value: "false", label: "No Carry Forward" },
  { value: "true", label: "Yes, Allow Carry Forward" },
];

const APPROVAL_OPTIONS = [
  { value: "true", label: "Yes, Requires Approval" },
  { value: "false", label: "No, Auto-Approved" },
];

const ATTACHMENT_OPTIONS = [
  { value: "false", label: "No (Optional)" },
  { value: "true", label: "Yes, Attachment Mandatory" },
];

interface LeaveTypeItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
  category: string;
  annualAllocation: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
  maxConsecutiveDays: number;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  minimumNoticeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    leaveBalances: number;
    leaveRequests: number;
  };
}

interface SummaryData {
  totalLeaveTypes: number;
  activeLeaveTypes: number;
  inactiveLeaveTypes: number;
  totalAllocatedDays: number;
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalLeaveTypes: 0,
    activeLeaveTypes: 0,
    inactiveLeaveTypes: 0,
    totalAllocatedDays: 0,
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [filterPaid, setFilterPaid] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Action Menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveTypeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Lock background scroll when any modal is open
  const isAnyModalOpen = createModalOpen || editModalOpen || viewModalOpen || deleteModalOpen;
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "Annual",
    annualAllocation: 12,
    isPaid: true,
    carryForward: true,
    maxCarryForwardDays: 0,
    maxConsecutiveDays: 14,
    requiresApproval: true,
    requiresAttachment: false,
    minimumNoticeDays: 1,
    isActive: true,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        category: filterCategory,
        status: filterStatus,
        paid: filterPaid,
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/leave-types?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLeaveTypes(data.leaveTypes || []);
        if (data.summary) setSummary(data.summary);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalFiltered ?? data.pagination.total ?? 0);
        }
      } else {
        showToast(data.error || "Failed to load leave types", "error");
      }
    } catch (err: any) {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterStatus, filterPaid, page]);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  // Create Leave Type
  const handleCreateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formData.name || !formData.code) {
      setModalError("Leave Name and Code are required.");
      showToast("Leave Name and Code are required", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Leave type created successfully!");
        setCreateModalOpen(false);
        resetForm();
        fetchLeaveTypes();
      } else {
        const errMsg = data.error || "Failed to create leave type";
        setModalError(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      setModalError("Network error connecting to server.");
      showToast("Network error creating leave type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Leave Type
  const handleEditLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveType) return;
    setModalError(null);

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/leave-types/${selectedLeaveType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Leave policy updated successfully!");
        setEditModalOpen(false);
        setSelectedLeaveType(null);
        fetchLeaveTypes();
      } else {
        const errMsg = data.error || "Failed to update leave policy";
        setModalError(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      setModalError("Network error updating leave policy.");
      showToast("Network error updating leave policy", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (lt: LeaveTypeItem) => {
    const newStatus = !lt.isActive;
    try {
      const res = await fetch(`/api/admin/leave-types/${lt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `Leave type '${lt.name}' is now ${newStatus ? "Active" : "Inactive"}`);
        setOpenMenuId(null);
        fetchLeaveTypes();
      } else {
        showToast(data.error || "Failed to toggle status", "error");
      }
    } catch (err) {
      showToast("Error updating status", "error");
    }
  };

  // Delete Leave Type
  const handleDeleteLeaveType = async () => {
    if (!selectedLeaveType) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/leave-types/${selectedLeaveType.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Leave type deleted permanently!");
        setDeleteModalOpen(false);
        setSelectedLeaveType(null);
        fetchLeaveTypes();
      } else {
        showToast(data.error || "Failed to delete leave type", "error");
      }
    } catch (err) {
      showToast("Network error deleting leave type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openViewModal = (lt: LeaveTypeItem) => {
    setSelectedLeaveType(lt);
    setViewModalOpen(true);
    setOpenMenuId(null);
  };

  const openEditModal = (lt: LeaveTypeItem) => {
    setSelectedLeaveType(lt);
    setModalError(null);
    setFormData({
      name: lt.name,
      code: lt.code,
      description: lt.description || "",
      category: lt.category || "Annual",
      annualAllocation: lt.annualAllocation || 0,
      isPaid: lt.isPaid ?? true,
      carryForward: lt.carryForward ?? true,
      maxCarryForwardDays: lt.maxCarryForwardDays || 0,
      maxConsecutiveDays: lt.maxConsecutiveDays || 14,
      requiresApproval: lt.requiresApproval ?? true,
      requiresAttachment: lt.requiresAttachment ?? false,
      minimumNoticeDays: lt.minimumNoticeDays || 0,
      isActive: lt.isActive,
    });
    setEditModalOpen(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (lt: LeaveTypeItem) => {
    setSelectedLeaveType(lt);
    setDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      category: "Annual",
      annualAllocation: 12,
      isPaid: true,
      carryForward: true,
      maxCarryForwardDays: 0,
      maxConsecutiveDays: 14,
      requiresApproval: true,
      requiresAttachment: false,
      minimumNoticeDays: 1,
      isActive: true,
    });
  };

  const isReferenced = (lt: LeaveTypeItem) => {
    return (lt._count?.leaveBalances || 0) > 0 || (lt._count?.leaveRequests || 0) > 0;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "bg-white text-slate-800 border-slate-200"
              : "bg-white text-rose-700 border-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Leave Types & Policies
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage leave categories, annual allocations, and leave policies.
          </p>
        </div>

        {/* Right Controls: Filter Tabs + Dropdowns + Create Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium border border-slate-200">
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
              All ({summary.totalLeaveTypes})
            </button>
            <button
              onClick={() => {
                setFilterStatus("ACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "ACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Active ({summary.activeLeaveTypes})
            </button>
            <button
              onClick={() => {
                setFilterStatus("INACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "INACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Inactive ({summary.inactiveLeaveTypes})
            </button>
          </div>

          {/* Paid / Unpaid Dropdown */}
          <ThemedSelect
            value={filterPaid}
            onChange={(val) => {
              setFilterPaid(val as any);
              setPage(1);
            }}
            options={PAID_FILTER_OPTIONS}
            size="xs"
            className="min-w-[140px]"
          />

          {/* Category Dropdown */}
          <ThemedSelect
            value={filterCategory}
            onChange={(val) => {
              setFilterCategory(val);
              setPage(1);
            }}
            options={CATEGORY_FILTER_OPTIONS}
            size="xs"
            className="min-w-[135px]"
          />

          {/* Primary Create Button */}
          <button
            onClick={() => {
              resetForm();
              setModalError(null);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Leave Type</span>
          </button>
        </div>
      </div>

      {/* 4. LEAVE TYPES TABLE */}
      {loading && leaveTypes.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
          Loading leave types and policy settings...
        </div>
      ) : leaveTypes.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-xs text-slate-700">No leave types found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Try adjusting your search criteria or create a new leave policy.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs transition-opacity duration-150 ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3 text-center">Annual Allocation</th>
                <th className="py-3 px-3 text-center">Carry Forward</th>
                <th className="py-3 px-3 text-center">Attachment</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {leaveTypes.map((lt) => {
                return (
                  <tr
                    key={lt.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Leave Type: Code + Name + Category Tag */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                          {lt.code}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 leading-snug">{lt.name}</div>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium mt-0.5">
                            {lt.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-slate-500 max-w-[220px]">
                      <span className="line-clamp-1" title={lt.description || ""}>
                        {lt.description || "—"}
                      </span>
                    </td>

                    {/* Annual Allocation & Compensation */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800">
                        {lt.annualAllocation > 0 ? `${lt.annualAllocation} Days` : "0 / Variable"}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold mt-0.5 ${
                          lt.isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {lt.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>

                    {/* Carry Forward */}
                    <td className="py-3 px-3 text-center text-slate-600">
                      {lt.carryForward ? (
                        <span className="text-indigo-700 font-semibold text-[11px]">
                          Yes ({lt.maxCarryForwardDays}d)
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>

                    {/* Attachment Required */}
                    <td className="py-3 px-3 text-center">
                      {lt.requiresAttachment ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                          <Paperclip className="w-2.5 h-2.5" />
                          Required
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Optional</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lt.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            lt.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{lt.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(lt)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Policy Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(lt)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Policy"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(lt)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between bg-white px-5 py-3.5 border-t border-slate-200/80 rounded-b-xl">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">{Math.min(page * 10, totalItems)}</span> of{" "}
              <span className="font-semibold text-slate-700">{totalItems}</span> leave types
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
      )}

      {/* CREATE LEAVE TYPE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleCreateLeaveType}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Create New Leave Type & Policy</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setCreateModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Error Alert Banner */}
            {modalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* SECTION: Basic Information */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Leave Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MAT, PAT, AL"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Leave Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maternity Leave"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <ThemedSelect
                      value={formData.category}
                      onChange={(val) => setFormData({ ...formData, category: val })}
                      options={CATEGORY_FORM_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Annual Allocation (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.annualAllocation}
                      onChange={(e) => setFormData({ ...formData, annualAllocation: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Compensation
                    </label>
                    <ThemedSelect
                      value={formData.isPaid ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, isPaid: val === "true" })}
                      options={PAID_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Status
                    </label>
                    <ThemedSelect
                      value={formData.isActive ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, isActive: val === "true" })}
                      options={ACTIVE_STATUS_OPTIONS}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief purpose, eligibility, and policy details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: Policy Settings */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Policy Rules & Restrictions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Consecutive Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxConsecutiveDays}
                      onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Minimum Notice Period (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minimumNoticeDays}
                      onChange={(e) => setFormData({ ...formData, minimumNoticeDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requires Manager Approval?
                    </label>
                    <ThemedSelect
                      value={formData.requiresApproval ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, requiresApproval: val === "true" })}
                      options={APPROVAL_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requires Document Attachment?
                    </label>
                    <ThemedSelect
                      value={formData.requiresAttachment ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, requiresAttachment: val === "true" })}
                      options={ATTACHMENT_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving..." : "Create Leave Type"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW LEAVE TYPE MODAL */}
      {viewModalOpen && selectedLeaveType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {selectedLeaveType.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{selectedLeaveType.name}</h3>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedLeaveType.description || "No description provided."}
            </p>

            {/* Policy Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Annual Allocation</span>
                <span className="font-semibold text-slate-900">
                  {selectedLeaveType.annualAllocation} Days / Year
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Leave Category</span>
                <span className="font-semibold text-slate-900">{selectedLeaveType.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Compensation Type</span>
                <span className="font-semibold text-slate-900">
                  {selectedLeaveType.isPaid ? "Paid Leave" : "Unpaid Leave"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedLeaveType.isActive ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedLeaveType.isActive ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {selectedLeaveType.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Policy Rules */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Rule Restrictions
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Carry Forward</span>
                  <span className="font-medium">
                    {selectedLeaveType.carryForward
                      ? `Allowed (${selectedLeaveType.maxCarryForwardDays}d max)`
                      : "Not Allowed"}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Max Consecutive Days</span>
                  <span className="font-medium">{selectedLeaveType.maxConsecutiveDays} Days</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Notice Period</span>
                  <span className="font-medium">
                    {selectedLeaveType.minimumNoticeDays} {selectedLeaveType.minimumNoticeDays === 1 ? "day" : "days"} in advance
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Approval Required</span>
                  <span className="font-medium">
                    {selectedLeaveType.requiresApproval ? "Yes (Manager/TL)" : "No (Auto-approved)"}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl sm:col-span-2">
                  <span className="text-[10px] text-slate-400 block">Documentation</span>
                  <span className="font-medium">
                    {selectedLeaveType.requiresAttachment
                      ? "Mandatory documentation attachment required"
                      : "Optional attachment"}
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Usage Stats */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div>
                Active Balances:{" "}
                <strong className="text-slate-700">
                  {selectedLeaveType._count?.leaveBalances || 0}
                </strong>
              </div>
              <div>
                Total Requests:{" "}
                <strong className="text-slate-700">
                  {selectedLeaveType._count?.leaveRequests || 0}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  openEditModal(selectedLeaveType);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Edit Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LEAVE TYPE MODAL */}
      {editModalOpen && selectedLeaveType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleEditLeaveType}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>Edit Leave Policy: {selectedLeaveType.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Error Alert Banner */}
            {modalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Basic Information */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Leave Code
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isReferenced(selectedLeaveType)}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none transition-all ${
                        isReferenced(selectedLeaveType)
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                          : "bg-slate-50 text-slate-900 focus:bg-white focus:border-slate-400"
                      }`}
                    />
                    {isReferenced(selectedLeaveType) && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Locked (Referenced by employee records)
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Leave Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <ThemedSelect
                      value={formData.category}
                      onChange={(val) => setFormData({ ...formData, category: val })}
                      options={CATEGORY_FORM_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Annual Allocation (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.annualAllocation}
                      onChange={(e) => setFormData({ ...formData, annualAllocation: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Compensation
                    </label>
                    <ThemedSelect
                      value={formData.isPaid ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, isPaid: val === "true" })}
                      options={PAID_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <ThemedSelect
                      value={formData.isActive ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, isActive: val === "true" })}
                      options={ACTIVE_STATUS_OPTIONS}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Policy Settings */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Policy Rules & Restrictions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Consecutive Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxConsecutiveDays}
                      onChange={(e) => setFormData({ ...formData, maxConsecutiveDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Minimum Notice Period (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minimumNoticeDays}
                      onChange={(e) => setFormData({ ...formData, minimumNoticeDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requires Manager Approval?
                    </label>
                    <ThemedSelect
                      value={formData.requiresApproval ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, requiresApproval: val === "true" })}
                      options={APPROVAL_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requires Document Attachment?
                    </label>
                    <ThemedSelect
                      value={formData.requiresAttachment ? "true" : "false"}
                      onChange={(val) => setFormData({ ...formData, requiresAttachment: val === "true" })}
                      options={ATTACHMENT_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedLeaveType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Delete Leave Type</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Check if referenced by records */}
            {isReferenced(selectedLeaveType) ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Cannot Delete Leave Type</strong>
                    <span>
                      This leave type is already associated with employee leave balances (
                      {selectedLeaveType._count?.leaveBalances || 0}) or leave requests (
                      {selectedLeaveType._count?.leaveRequests || 0}).
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Historical employee records must be preserved. Would you like to{" "}
                  <strong>deactivate</strong> it instead so it no longer appears in request dropdowns?
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      handleToggleStatus(selectedLeaveType);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Deactivate Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-slate-900">{selectedLeaveType.name}</strong> ({selectedLeaveType.code})?
                  This unused leave type will be permanently removed.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteLeaveType}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                  >
                    {submitting ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
