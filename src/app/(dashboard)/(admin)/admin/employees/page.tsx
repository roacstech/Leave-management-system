"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Team {
  id: number;
  name: string;
}

interface TeamLead {
  id: number;
  name: string;
  email: string;
  teamId?: number | null;
}

interface EmployeeItem {
  id: number;
  name: string;
  email: string;
  role: "EMPLOYEE" | "TL" | "ADMIN" | "CEO";
  teamId: number | null;
  reportingToId?: number | null;
  isActive: boolean;
  team?: Team | null;
  reportingTo?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null;
  createdAt: string;
  _count?: {
    leaveRequests: number;
    attendance: number;
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "EMPLOYEE",
    teamId: "",
    reportingToId: "",
    isActive: true,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        role: filterRole,
        status: filterStatus,
        search: search.trim(),
      });

      const res = await fetch(`/api/admin/employees?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        setTeams(data.teams || []);
        setTeamLeads(data.teamLeads || []);
        if (data.pagination) {
          setPaginationInfo({
            total: data.pagination.total || 0,
            totalPages: data.pagination.totalPages || 1,
            activeCount: data.pagination.activeCount || 0,
            inactiveCount: data.pagination.inactiveCount || 0,
          });
        }
      } else {
        showToast(data.error || "Failed to load employees", "error");
      }
    } catch (err: any) {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterRole, filterStatus, search]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Reset to page 1 when filter/search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleRoleChange = (role: string) => {
    setFilterRole(role);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: "ALL" | "ACTIVE" | "INACTIVE") => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast("Please fill in required fields", "error");
      return;
    }

    if (formData.role === "EMPLOYEE" && !formData.reportingToId) {
      showToast("Please select a Reporting Team Leader (TL) for this employee", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teamId: formData.teamId ? Number(formData.teamId) : null,
          reportingToId:
            formData.role === "EMPLOYEE" && formData.reportingToId
              ? Number(formData.reportingToId)
              : null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Employee created successfully!");
        setCreateModalOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to create employee", "error");
      }
    } catch (err) {
      showToast("Network error creating employee", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Employee
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (formData.role === "EMPLOYEE" && !formData.reportingToId) {
      showToast("Please select a Reporting Team Leader (TL) for this employee", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEmployee.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          teamId: formData.teamId ? Number(formData.teamId) : null,
          reportingToId:
            formData.role === "EMPLOYEE" && formData.reportingToId
              ? Number(formData.reportingToId)
              : null,
          isActive: formData.isActive,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Employee updated successfully!");
        setEditModalOpen(false);
        setSelectedEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to update employee", "error");
      }
    } catch (err) {
      showToast("Network error updating employee", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/employees?id=${selectedEmployee.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || "Employee deleted successfully!");
        setDeleteModalOpen(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to delete employee", "error");
      }
    } catch (err) {
      showToast("Network error deleting employee", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Toggle Status (Active / Inactive) via Action Toggle Switch
  const handleToggleStatus = async (emp: EmployeeItem) => {
    const newStatus = !emp.isActive;
    try {
      setTogglingId(emp.id);
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emp.id,
          isActive: newStatus,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Marked ${emp.name} as ${newStatus ? "Active" : "Inactive"}`);
        setEmployees((prev) =>
          prev.map((item) => (item.id === emp.id ? { ...item, isActive: newStatus } : item))
        );
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to toggle status", "error");
      }
    } catch (err) {
      showToast("Error updating employee status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      teamId: emp.teamId ? String(emp.teamId) : "",
      reportingToId: emp.reportingToId
        ? String(emp.reportingToId)
        : emp.reportingTo?.id
        ? String(emp.reportingTo.id)
        : "",
      isActive: emp.isActive ?? true,
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "password123",
      role: "EMPLOYEE",
      teamId: "",
      reportingToId: "",
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
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-sm border text-xs font-medium ${
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
            className="ml-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UNIFIED HEADER & FILTER BOX - All contents in one single box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Top Section: Title, Description & Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Employees Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage organization staff, Team Leads, departments, and active statuses.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Employee</span>
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
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => handleStatusChange("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterStatus === "ALL"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({paginationInfo.activeCount + paginationInfo.inactiveCount})
              </button>
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterStatus === "ACTIVE"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active ({paginationInfo.activeCount})
              </button>
              <button
                onClick={() => handleStatusChange("INACTIVE")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterStatus === "INACTIVE"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Inactive ({paginationInfo.inactiveCount})
              </button>
            </div>

            {/* Role filter */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs">
              {["ALL", "EMPLOYEE", "TL"].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterRole === role
                      ? "bg-white text-slate-900 font-semibold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {role === "ALL" ? "All Roles" : role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EMPLOYEES TABLE UI: Columns arranged: EMPLOYEE | ROLE | DEPARTMENT / TEAM | JOINED DATE | STATUS | ACTIONS */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department / Team</th>
                <th className="py-3 px-3">Joined Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading employees (page {currentPage})...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No employees found matching criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isActive = emp.isActive !== false;
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* 1. Employee Name & Email */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {emp.email}
                          </div>
                          {emp.role === "EMPLOYEE" && (
                            <div className="text-[10px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                              <span className="text-slate-400">Reporting TL:</span>
                              <span className="font-semibold text-slate-700">
                                {emp.reportingTo ? emp.reportingTo.name : "Unassigned"}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Role */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {emp.role}
                        </span>
                      </td>

                      {/* 3. Department / Team */}
                      <td className="py-3 px-3 text-slate-600">
                        {emp.team?.name || "—"}
                      </td>

                      {/* 4. Joined Date */}
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(emp.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* 5. Status Badge (Moved before Actions) */}
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

                      {/* 6. Actions: Toggle Switch + Edit + Delete */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Active / Inactive Toggle Switch */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              disabled={togglingId === emp.id}
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
                          </div>

                          <div className="h-3.5 w-px bg-slate-200" />

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee"
                            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => openDeleteModal(emp)}
                            title="Delete Employee"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                <strong className="text-slate-800">{paginationInfo.total}</strong> employees
              </span>
            ) : (
              <span>0 employees</span>
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

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <form
            onSubmit={handleCreateEmployee}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Create New Employee
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
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TL">Team Lead (TL)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department / Team
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="">-- No Department --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Reporting TL field: ONLY for EMPLOYEE role */}
              {formData.role === "EMPLOYEE" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assign Reporting TL <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.reportingToId}
                    onChange={(e) =>
                      setFormData({ ...formData, reportingToId: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="">-- Select Team Leader (TL) --</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Employee will report to this specific TL for leaves & attendance.
                  </p>
                </div>
              )}

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
                {submitting ? "Saving..." : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <form
            onSubmit={handleEditEmployee}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Employee: {selectedEmployee.name}
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TL">Team Lead (TL)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department / Team
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="">-- No Department --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Reporting TL field: ONLY for EMPLOYEE role */}
              {formData.role === "EMPLOYEE" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assign Reporting TL <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.reportingToId}
                    onChange={(e) =>
                      setFormData({ ...formData, reportingToId: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  >
                    <option value="">-- Select Team Leader (TL) --</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Employee will report to this specific TL for leaves & attendance.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Active Status
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
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                <span>Delete Employee</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">{selectedEmployee.name}</strong>?
              This will remove the employee records from the database.
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
                onClick={handleDeleteEmployee}
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
