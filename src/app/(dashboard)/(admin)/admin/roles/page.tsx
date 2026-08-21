"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Shield,
  ShieldPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
} from "lucide-react";

interface RoleItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
  permissions: string | null;
  accessLevel: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 1,
    activeCount: 0,
    inactiveCount: 0,
  });

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    accessLevel: "STANDARD",
    isActive: true,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRolesData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        status: filterStatus,
        search: search.trim(),
      });

      const res = await fetch(`/api/admin/roles?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        if (data.pagination) {
          setPaginationInfo({
            total: data.pagination.total || 0,
            totalPages: data.pagination.totalPages || 1,
            activeCount: data.pagination.activeCount || 0,
            inactiveCount: data.pagination.inactiveCount || 0,
          });
        }
      } else {
        showToast(data.error || "Failed to load roles", "error");
      }
    } catch (err: any) {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, search]);

  useEffect(() => {
    fetchRolesData();
  }, [fetchRolesData]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: "ALL" | "ACTIVE" | "INACTIVE") => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Handle Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      showToast("Role Name and Code are required", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Role created successfully!");
        setCreateModalOpen(false);
        resetForm();
        fetchRolesData();
      } else {
        showToast(data.error || "Failed to create role", "error");
      }
    } catch (err) {
      showToast("Network error creating role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Role
  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRole.id,
          name: formData.name,
          code: formData.code,
          description: formData.description,
          accessLevel: formData.accessLevel,
          isActive: formData.isActive,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Role updated successfully!");
        setEditModalOpen(false);
        setSelectedRole(null);
        resetForm();
        fetchRolesData();
      } else {
        showToast(data.error || "Failed to update role", "error");
      }
    } catch (err) {
      showToast("Network error updating role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/roles?id=${selectedRole.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Role deleted successfully!");
        setDeleteModalOpen(false);
        setSelectedRole(null);
        fetchRolesData();
      } else {
        showToast(data.error || "Failed to delete role", "error");
      }
    } catch (err) {
      showToast("Network error deleting role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle Switch
  const handleToggleStatus = async (role: RoleItem) => {
    const newStatus = !role.isActive;
    try {
      setTogglingId(role.id);
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: role.id,
          isActive: newStatus,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Marked role ${role.name} as ${newStatus ? "Active" : "Inactive"}`);
        setRoles((prev) =>
          prev.map((item) => (item.id === role.id ? { ...item, isActive: newStatus } : item))
        );
        fetchRolesData();
      } else {
        showToast(data.error || "Failed to toggle role status", "error");
      }
    } catch (err) {
      showToast("Error updating role status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (role: RoleItem) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || "",
      accessLevel: role.accessLevel || "STANDARD",
      isActive: role.isActive ?? true,
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (role: RoleItem) => {
    setSelectedRole(role);
    setDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      accessLevel: "STANDARD",
      isActive: true,
    });
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, paginationInfo.total);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="text-white font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UNIFIED HEADER & FILTER BOX - All in one single box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Top Section: Title, Description & Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Roles Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, edit, delete, and configure system and custom organization roles.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <ShieldPlus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
        </div>

        {/* Clean Divider */}
        <div className="h-px bg-slate-100" />

        {/* Bottom Section: Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-0.5">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role name, code, description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => handleStatusFilterChange("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "ALL"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({paginationInfo.activeCount + paginationInfo.inactiveCount})
            </button>
            <button
              onClick={() => handleStatusFilterChange("ACTIVE")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "ACTIVE"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active ({paginationInfo.activeCount})
            </button>
            <button
              onClick={() => handleStatusFilterChange("INACTIVE")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "INACTIVE"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Inactive ({paginationInfo.inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* ROLES TABLE UI: Same Table UI layout as Employee Management */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Role Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Access Level</th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading roles (page {currentPage})...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No roles found matching criteria.
                  </td>
                </tr>
              ) : (
                roles.map((r) => {
                  const isActive = r.isActive !== false;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* 1. Role Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {r.isSystem && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                  System
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Code */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
                          {r.code}
                        </span>
                      </td>

                      {/* 3. Description */}
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {r.description || "—"}
                      </td>

                      {/* 4. Access Level */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.accessLevel === "ADMIN" || r.accessLevel === "EXECUTIVE"
                              ? "bg-slate-900 text-white"
                              : r.accessLevel === "LEAD" || r.accessLevel === "MANAGEMENT"
                              ? "bg-slate-200 text-slate-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.accessLevel}
                        </span>
                      </td>

                      {/* 5. Assigned Staff Count */}
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.userCount} {r.userCount === 1 ? "user" : "users"}</span>
                        </div>
                      </td>

                      {/* 6. Status Badge (Before Actions) */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
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

                      {/* 7. Actions: Toggle Switch + Edit + Delete */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Active / Inactive Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(r)}
                            disabled={togglingId === r.id}
                            title={isActive ? "Click to deactivate role" : "Click to activate role"}
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

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Role"
                            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button (disabled for core system roles) */}
                          <button
                            onClick={() => openDeleteModal(r)}
                            disabled={r.isSystem}
                            title={r.isSystem ? "System roles cannot be deleted" : "Delete Role"}
                            className={`p-1 rounded transition-colors ${
                              r.isSystem
                                ? "text-slate-200 cursor-not-allowed"
                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            }`}
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

        {/* PAGINATION FOOTER - 10 items per page */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {paginationInfo.total > 0 ? (
              <span>
                Showing <strong className="text-slate-800">{startIndex}</strong> to{" "}
                <strong className="text-slate-800">{endIndex}</strong> of{" "}
                <strong className="text-slate-800">{paginationInfo.total}</strong> roles
              </span>
            ) : (
              <span>0 roles</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                    currentPage === pageNum
                      ? "bg-slate-900 text-white font-semibold shadow-2xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(paginationInfo.totalPages, prev + 1))}
              disabled={currentPage >= paginationInfo.totalPages || loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE ROLE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <form
            onSubmit={handleCreateRole}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldPlus className="w-4 h-4 text-slate-800" />
                <span>Create New Role</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR Manager, QA Lead"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = name.toUpperCase().replace(/\s+/g, "_");
                    setFormData({ ...formData, name, code: formData.code || autoCode });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HR_MGR"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Access Level
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="STANDARD">Standard Staff</option>
                    <option value="LEAD">Team Lead</option>
                    <option value="MANAGEMENT">Management</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="EXECUTIVE">Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the responsibilities and scope of this role..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Role"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editModalOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <form
            onSubmit={handleEditRole}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-800" />
                <span>Edit Role: {selectedRole.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={selectedRole.isSystem}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none ${
                      selectedRole.isSystem ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Access Level
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="STANDARD">Standard Staff</option>
                    <option value="LEAD">Team Lead</option>
                    <option value="MANAGEMENT">Management</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="EXECUTIVE">Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
              >
                {submitting ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Delete Role</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the role{" "}
              <strong className="text-slate-900">{selectedRole.name}</strong> ({selectedRole.code})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={submitting}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
