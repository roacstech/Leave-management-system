"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Network,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Layers,
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import ThemedSelect from "@/components/ui/ThemedSelect";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

interface DepartmentItem {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
  };
}

export default function DepartmentsPage() {
  const { formatDate } = useSettings();

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Summary counts
  const [stats, setStats] = useState({
    total: 0,
    activeCount: 0,
    inactiveCount: 0,
    totalStaff: 0,
  });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Lock background scroll when any modal is open
  const isAnyModalOpen = createModalOpen || editModalOpen || deleteModalOpen;
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
    description: "",
    isActive: true,
  });

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/departments?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const list: DepartmentItem[] = data.departments || [];
        setDepartments(list);

        const totalStaff = list.reduce((acc, curr) => acc + (curr._count?.users || 0), 0);

        setStats({
          total: data.pagination?.total ?? list.length,
          activeCount: data.pagination?.activeCount ?? list.filter((d) => d.isActive).length,
          inactiveCount: data.pagination?.inactiveCount ?? list.filter((d) => !d.isActive).length,
          totalStaff,
        });

        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalFiltered ?? data.pagination.total ?? 0);
        }
      } else {
        showToast(data.error || "Failed to load departments", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, page]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Handle Create Department
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Department name is required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Department created successfully!");
        setCreateModalOpen(false);
        setFormData({ name: "", description: "", isActive: true });
        fetchDepartments();
      } else {
        showToast(data.error || "Failed to create department", "error");
      }
    } catch {
      showToast("Network error creating department", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Department
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !formData.name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/departments/${selectedDept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Department updated successfully!");
        setEditModalOpen(false);
        setSelectedDept(null);
        setFormData({ name: "", description: "", isActive: true });
        fetchDepartments();
      } else {
        showToast(data.error || "Failed to update department", "error");
      }
    } catch {
      showToast("Network error updating department", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Department
  const handleDelete = async () => {
    if (!selectedDept) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/departments/${selectedDept.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Department deleted successfully!");
        setDeleteModalOpen(false);
        setSelectedDept(null);
        fetchDepartments();
      } else {
        showToast(data.error || "Failed to delete department", "error");
      }
    } catch {
      showToast("Network error deleting department", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (dept: DepartmentItem) => {
    const newStatus = !dept.isActive;
    try {
      setTogglingId(dept.id);
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Marked "${dept.name}" as ${newStatus ? "Active" : "Inactive"}`);
        setDepartments((prev) =>
          prev.map((item) => (item.id === dept.id ? { ...item, isActive: newStatus } : item))
        );
        fetchDepartments();
      } else {
        showToast(data.error || "Failed to toggle status", "error");
      }
    } catch {
      showToast("Error updating department status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      isActive: dept.isActive,
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-900 text-white border-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Departments Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage organization departments, teams, and active statuses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setFilterStatus("ALL");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
                filterStatus === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("ACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
                filterStatus === "ACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Active ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("INACTIVE");
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all font-semibold cursor-pointer ${
                filterStatus === "INACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Inactive ({stats.inactiveCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormData({ name: "", description: "", isActive: true });
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Staff Members</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading departments...</span>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No departments found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;+ Create Department&quot; to add a new department.
                    </p>
                  </td>
                </tr>
              ) : (
                departments.map((dept) => {
                  const isActive = dept.isActive !== false;
                  const memberCount = dept._count?.users ?? 0;
                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Department Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">
                              {dept.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {dept.description || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Staff Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200">
                          <Users className="w-3 h-3 text-indigo-500" />
                          <span>{memberCount} staff</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(new Date(dept.createdAt))}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* Actions: Toggle Switch + Edit + Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Active / Inactive Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(dept)}
                            disabled={togglingId === dept.id}
                            title={isActive ? "Click to deactivate" : "Click to activate"}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                              isActive ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            role="switch"
                            aria-checked={isActive}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>

                          <div className="h-3.5 w-px bg-slate-200" />

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(dept)}
                            title="Edit Department"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(dept)}
                            title="Delete Department"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            <span className="font-semibold text-slate-700">{totalItems}</span> departments
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

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-700" />
                <span>Create New Department</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering, Sales, HR"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of responsibilities or team function..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Department</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
          <form
            onSubmit={handleEdit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-700" />
                <span>Edit Department: {selectedDept.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Active Status
                </label>
                <ThemedSelect
                  value={formData.isActive ? "true" : "false"}
                  onChange={(val) =>
                    setFormData({ ...formData, isActive: val === "true" })
                  }
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Delete Department</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the department{" "}
              <strong className="text-slate-900">&quot;{selectedDept.name}&quot;</strong>?
              Any currently assigned employees ({selectedDept._count?.users ?? 0} staff) will be
              unassigned from this department.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
