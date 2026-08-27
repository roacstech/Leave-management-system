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
  Plus,
  Check,
  Loader2,
  Shield,
  ShieldPlus,
  Building2,
  Mail,
  User as UserIcon,
  Lock,
  Briefcase,
} from "lucide-react";
import ThemedSelect from "@/components/ui/ThemedSelect";

interface Team {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
  _count?: {
    users: number;
  };
}

interface TeamLead {
  id: number;
  name: string;
  email: string;
  teamId?: number | null;
}

interface RoleOption {
  id?: number;
  name: string;
  code: string;
  accessLevel?: string;
  isSystem?: boolean;
  description?: string | null;
  isActive?: boolean;
}

const DEFAULT_ROLES: RoleOption[] = [
  { name: "Employee", code: "EMPLOYEE", accessLevel: "STANDARD", isSystem: true },
  { name: "Manager", code: "TL", accessLevel: "LEAD", isSystem: true },
  { name: "Admin", code: "ADMIN", accessLevel: "ADMIN", isSystem: true },
];

interface EmployeeItem {
  id: number;
  name: string;
  email: string;
  role: string;
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
  const [rolesList, setRolesList] = useState<RoleOption[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Inline Creation States
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleAccessLevel, setNewRoleAccessLevel] = useState("STANDARD");
  const [creatingRole, setCreatingRole] = useState(false);

  // Manage Roles Modal States
  const [manageRolesModalOpen, setManageRolesModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleAccessLevel, setEditRoleAccessLevel] = useState("STANDARD");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  // Manage Departments Modal States
  const [manageDeptsModalOpen, setManageDeptsModalOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDescription, setEditDeptDescription] = useState("");
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

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
    password: "",
    confirmPassword: "",
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
        if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
          setRolesList(data.roles);
        }
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
    } catch {
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

  // Quick Create Department Handler
  const handleQuickCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      showToast("Please enter a department name", "error");
      return;
    }

    try {
      setCreatingDept(true);
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim(), isActive: true }),
      });
      const data = await res.json();
      if (data.success && data.department) {
        showToast(`Department "${data.department.name}" created!`, "success");
        const created = { id: data.department.id, name: data.department.name };
        setTeams((prev) => {
          if (prev.some((t) => t.id === created.id)) return prev;
          return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        });
        setFormData((prev) => ({ ...prev, teamId: String(created.id) }));
        setNewDeptName("");
        setIsAddingDept(false);
      } else {
        showToast(data.error || "Failed to create department", "error");
      }
    } catch {
      showToast("Error creating department", "error");
    } finally {
      setCreatingDept(false);
    }
  };

  // Quick Create Role Handler
  const handleQuickCreateRole = async () => {
    if (!newRoleName.trim()) {
      showToast("Please enter a role name", "error");
      return;
    }
    const autoCode = newRoleName.trim().toUpperCase().replace(/\s+/g, "_");

    try {
      setCreatingRole(true);
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          code: autoCode,
          accessLevel: newRoleAccessLevel,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.role) {
        showToast(`Role "${data.role.name}" created!`, "success");
        const createdRole: RoleOption = {
          name: data.role.name,
          code: data.role.code,
          accessLevel: data.role.accessLevel,
        };
        setRolesList((prev) => {
          if (prev.some((r) => r.code === createdRole.code)) return prev;
          return [...prev, createdRole];
        });
        setFormData((prev) => ({ ...prev, role: createdRole.code }));
        setNewRoleName("");
        setIsAddingRole(false);
      } else {
        showToast(data.error || "Failed to create role", "error");
      }
    } catch {
      showToast("Error creating role", "error");
    } finally {
      setCreatingRole(false);
    }
  };

  // Handle Role Edit & Delete
  const startEditingRole = (role: RoleOption) => {
    if (!role.id) return;
    setEditingRoleId(role.id);
    setEditRoleName(role.name);
    setEditRoleAccessLevel(role.accessLevel || "STANDARD");
    setEditRoleDescription(role.description || "");
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId || !editRoleName.trim()) {
      showToast("Role name cannot be empty", "error");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRoleId,
          name: editRoleName.trim(),
          accessLevel: editRoleAccessLevel,
          description: editRoleDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Role updated successfully!", "success");
        setEditingRoleId(null);
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to update role", "error");
      }
    } catch {
      showToast("Error updating role", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Role deleted successfully!", "success");
        setDeletingRoleId(null);
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to delete role", "error");
      }
    } catch {
      showToast("Error deleting role", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Department Edit & Delete
  const startEditingDept = (dept: Team) => {
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
    setEditDeptDescription(dept.description || "");
  };

  const handleUpdateDepartment = async () => {
    if (!editingDeptId || !editDeptName.trim()) {
      showToast("Department name cannot be empty", "error");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/departments/${editingDeptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDeptName.trim(),
          description: editDeptDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Department updated successfully!", "success");
        setEditingDeptId(null);
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to update department", "error");
      }
    } catch {
      showToast("Error updating department", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDepartment = async (deptId: number) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/departments/${deptId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Department deleted successfully!", "success");
        setDeletingDeptId(null);
        fetchEmployees();
      } else {
        showToast(data.error || "Failed to delete department", "error");
      }
    } catch {
      showToast("Error deleting department", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast("Please fill in required fields", "error");
      return;
    }

    const currentRoleObj = rolesList.find((r) => r.code === formData.role);
    const isEmployeeRole = formData.role === "EMPLOYEE" || currentRoleObj?.accessLevel === "STANDARD";

    if (isEmployeeRole && !formData.reportingToId) {
      showToast("Please select a Reporting Manager for this employee", "error");
      return;
    }

    if (!formData.password) {
      showToast("Password is required", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
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
            isEmployeeRole && formData.reportingToId
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
    } catch {
      showToast("Network error creating employee", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Employee
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const currentRoleObj = rolesList.find((r) => r.code === formData.role);
    const isEmployeeRole = formData.role === "EMPLOYEE" || currentRoleObj?.accessLevel === "STANDARD";

    if (isEmployeeRole && !formData.reportingToId) {
      showToast("Please select a Reporting Manager for this employee", "error");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error");
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
            isEmployeeRole && formData.reportingToId
              ? Number(formData.reportingToId)
              : null,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {}),
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
    } catch {
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
    } catch {
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
    } catch {
      showToast("Error updating employee status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (emp: EmployeeItem) => {
    setSelectedEmployee(emp);
    setIsAddingDept(false);
    setIsAddingRole(false);
    setNewDeptName("");
    setNewRoleName("");
    setFormData({
      name: emp.name,
      email: emp.email,
      password: "",
      confirmPassword: "",
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
      password: "",
      confirmPassword: "",
      role: "EMPLOYEE",
      teamId: "",
      reportingToId: "",
      isActive: true,
    });
    setIsAddingDept(false);
    setIsAddingRole(false);
    setNewDeptName("");
    setNewRoleName("");
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, paginationInfo.total);

  const isFormEmployeeRole =
    formData.role === "EMPLOYEE" ||
    rolesList.find((r) => r.code === formData.role)?.accessLevel === "STANDARD";

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
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
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Section: Title & Description */}
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Employees Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization staff, Managers, departments, and active statuses.
          </p>
        </div>

        {/* Right Section: Filter Tabs, Role Select & Create Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium">
            <button
              onClick={() => handleStatusChange("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              All ({paginationInfo.activeCount + paginationInfo.inactiveCount})
            </button>
            <button
              onClick={() => handleStatusChange("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "ACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Active ({paginationInfo.activeCount})
            </button>
            <button
              onClick={() => handleStatusChange("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "INACTIVE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Inactive ({paginationInfo.inactiveCount})
            </button>
          </div>

          {/* Dynamic Role Filter Dropdown */}
          <div className="w-40 sm:w-44 shrink-0">
            <ThemedSelect
              value={filterRole}
              onChange={(val) => handleRoleChange(val)}
              options={[
                { value: "ALL", label: "All Roles" },
                ...rolesList.map((r) => ({
                  value: r.code,
                  label: r.name,
                })),
              ]}
              size="xs"
            />
          </div>

          <button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Employee</span>
          </button>
        </div>
      </div>

      {/* EMPLOYEES TABLE UI */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department / Team</th>
                <th className="py-3 px-3">Joined Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 text-xs transition-opacity duration-150 ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                    <span>Loading employees (page {currentPage})...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No employees found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Create New Employee&quot; to add organization members.
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isActive = emp.isActive !== false;
                  const roleItem = rolesList.find((r) => r.code === emp.role);
                  const roleDisplayName = roleItem
                    ? roleItem.name
                    : emp.role === "TL"
                    ? "Manager"
                    : emp.role;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Employee Name & Email */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-900">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {emp.email}
                          </div>
                          {emp.role === "EMPLOYEE" && (
                            <div className="text-[10px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                              <span className="text-slate-400">Reporting Manager:</span>
                              <span className="font-semibold text-slate-700">
                                {emp.reportingTo ? emp.reportingTo.name : "Unassigned"}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Role Badge */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                            emp.role === "ADMIN" || emp.role === "CEO"
                              ? "bg-slate-900 text-white border-slate-800"
                              : emp.role === "TL"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {roleDisplayName}
                        </span>
                      </td>

                      {/* 3. Department / Team */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {emp.team?.name || <span className="text-slate-300">—</span>}
                      </td>

                      {/* 4. Joined Date */}
                      <td className="py-3.5 px-3 text-slate-400">
                        {new Date(emp.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-3.5 px-3">
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

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Active Toggle */}
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

                          <div className="h-3.5 w-px bg-slate-200" />

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(emp)}
                            title="Edit Employee"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => openDeleteModal(emp)}
                            title="Delete Employee"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* PAGINATION FOOTER */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-indigo-600 text-white shadow-xs"
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLEAN & SPACIOUS CREATE EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Employee</h3>
                  <p className="text-[11px] text-slate-500">
                    Add employee profile, credentials, organization role, and department.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateEmployee} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Details: Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="sarah.jenkins@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      System Role <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingRole(!isAddingRole)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingRole ? "Cancel" : "Add Role"}</span>
                    </button>
                  </div>

                  {isAddingRole ? (
                    <div className="flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="New Role (e.g. HR Manager)"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        disabled={creatingRole}
                        onClick={handleQuickCreateRole}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        {creatingRole ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <ThemedSelect
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val })}
                      options={rolesList.map((r) => ({
                        value: r.code,
                        label: r.name,
                      }))}
                      size="md"
                    />
                  )}
                </div>

                {/* Department Selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Department / Team
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingDept(!isAddingDept)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingDept ? "Cancel" : "Add Dept"}</span>
                    </button>
                  </div>

                  {isAddingDept ? (
                    <div className="flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="New Dept (e.g. Marketing)"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        disabled={creatingDept}
                        onClick={handleQuickCreateDepartment}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        {creatingDept ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <ThemedSelect
                      value={formData.teamId}
                      onChange={(val) => setFormData({ ...formData, teamId: val })}
                      options={[
                        { value: "", label: "No Department (Unassigned)" },
                        ...teams.map((t) => ({
                          value: String(t.id),
                          label: t.name,
                        })),
                      ]}
                      size="md"
                    />
                  )}
                </div>
              </div>

              {/* Reporting Manager (If Employee Role) */}
              {isFormEmployeeRole && (
                <div className="space-y-1 p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 animate-in fade-in">
                  <label className="block text-xs font-semibold text-slate-800">
                    Reporting Manager (Team Lead / Admin) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Leave requests submitted by this employee will be routed to this manager.
                  </p>
                  <ThemedSelect
                    value={formData.reportingToId}
                    onChange={(val) => setFormData({ ...formData, reportingToId: val })}
                    options={[
                      { value: "", label: "Select Reporting Manager..." },
                      ...teamLeads.map((tl) => ({
                        value: String(tl.id),
                        label: `${tl.name} (${tl.email})`,
                      })),
                    ]}
                    size="md"
                  />
                </div>
              )}


              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLEAN & SPACIOUS EDIT EMPLOYEE MODAL */}
      {/* ========================================================================= */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Employee: {selectedEmployee.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update profile info, department, role, reporting manager, or password.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditEmployee} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Details: Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password & Confirm Password (Optional on edit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Change Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="New password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      System Role <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingRole(!isAddingRole)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingRole ? "Cancel" : "Add Role"}</span>
                    </button>
                  </div>

                  {isAddingRole ? (
                    <div className="flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="New Role (e.g. HR Manager)"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        disabled={creatingRole}
                        onClick={handleQuickCreateRole}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        {creatingRole ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <ThemedSelect
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val })}
                      options={rolesList.map((r) => ({
                        value: r.code,
                        label: r.name,
                      }))}
                      size="md"
                    />
                  )}
                </div>

                {/* Department Selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Department / Team
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingDept(!isAddingDept)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAddingDept ? "Cancel" : "Add Dept"}</span>
                    </button>
                  </div>

                  {isAddingDept ? (
                    <div className="flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="New Dept (e.g. Marketing)"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        disabled={creatingDept}
                        onClick={handleQuickCreateDepartment}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        {creatingDept ? "..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <ThemedSelect
                      value={formData.teamId}
                      onChange={(val) => setFormData({ ...formData, teamId: val })}
                      options={[
                        { value: "", label: "No Department (Unassigned)" },
                        ...teams.map((t) => ({
                          value: String(t.id),
                          label: t.name,
                        })),
                      ]}
                      size="md"
                    />
                  )}
                </div>
              </div>

              {/* Reporting Manager (If Employee Role) */}
              {isFormEmployeeRole && (
                <div className="space-y-1 p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 animate-in fade-in">
                  <label className="block text-xs font-semibold text-slate-800">
                    Reporting Manager (Team Lead / Admin) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Leave requests submitted by this employee will be routed to this manager.
                  </p>
                  <ThemedSelect
                    value={formData.reportingToId}
                    onChange={(val) => setFormData({ ...formData, reportingToId: val })}
                    options={[
                      { value: "", label: "Select Reporting Manager..." },
                      ...teamLeads.map((tl) => ({
                        value: String(tl.id),
                        label: `${tl.name} (${tl.email})`,
                      })),
                    ]}
                    size="md"
                  />
                </div>
              )}

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800">Account Status</span>
                  <p className="text-[11px] text-slate-500">
                    Active employees can log in and submit leave requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    formData.isActive ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete Employee</span>
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">&quot;{selectedEmployee.name}&quot;</strong>?
              This action cannot be undone and will remove employee records from the system.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployee}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE ROLES MODAL (CREATE, EDIT & DELETE ROLES) */}
      {/* ========================================================================= */}
      {manageRolesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manage Roles</h3>
                  <p className="text-[11px] text-slate-500">
                    Create, edit, or delete role definitions and access permissions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRole(!isAddingRole)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Role</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManageRolesModalOpen(false);
                    setEditingRoleId(null);
                    setDeletingRoleId(null);
                    setIsAddingRole(false);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[65vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 pr-3">
              {/* Inline Role Creator */}
              {isAddingRole && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                      <ShieldPlus className="w-4 h-4 text-indigo-600" />
                      <span>Create New Role</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingRole(false);
                        setNewRoleName("");
                      }}
                      className="text-indigo-400 hover:text-indigo-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Role Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Senior QA Engineer, DevOps Lead"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Access Scope
                      </label>
                      <ThemedSelect
                        size="sm"
                        value={newRoleAccessLevel}
                        onChange={(val) => setNewRoleAccessLevel(val)}
                        options={[
                          { value: "STANDARD", label: "Standard Employee" },
                          { value: "LEAD", label: "Team Lead / Manager" },
                          { value: "ADMIN", label: "System Administrator" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingRole(false);
                        setNewRoleName("");
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={creatingRole || !newRoleName.trim()}
                      onClick={handleQuickCreateRole}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      {creatingRole && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Save Role</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Roles List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Active Roles ({rolesList.length})
                </div>

                {rolesList.map((role) => {
                  const isEditingThis = editingRoleId === role.id;
                  const isDeletingThis = deletingRoleId === role.id;
                  const isSystemRole =
                    role.isSystem ||
                    ["CEO", "ADMIN", "TL", "EMPLOYEE"].includes(role.code.toUpperCase());

                  if (isEditingThis) {
                    return (
                      <div
                        key={role.code}
                        className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-3 shadow-2xs animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Edit Role: {role.name}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {role.code}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Role Title
                            </label>
                            <input
                              type="text"
                              value={editRoleName}
                              onChange={(e) => setEditRoleName(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Access Level
                            </label>
                            <ThemedSelect
                              size="sm"
                              value={editRoleAccessLevel}
                              onChange={(val) => setEditRoleAccessLevel(val)}
                              options={[
                                { value: "STANDARD", label: "Standard Employee" },
                                { value: "LEAD", label: "Team Lead / Manager" },
                                { value: "ADMIN", label: "System Administrator" },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditingRoleId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading || !editRoleName.trim()}
                            onClick={handleUpdateRole}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={role.code}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{role.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {role.code}
                            </span>
                            {isSystemRole ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                System
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Scope:{" "}
                            <span className="font-medium text-slate-700">
                              {role.accessLevel === "ADMIN"
                                ? "System Administrator"
                                : role.accessLevel === "LEAD"
                                ? "Team Lead / Manager"
                                : "Standard Employee"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {role.id && (
                          <button
                            type="button"
                            onClick={() => startEditingRole(role)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isSystemRole && role.id ? (
                          isDeletingThis ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in">
                              <span className="text-[10px] font-bold text-rose-700 px-1">Delete?</span>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleDeleteRole(role.id!)}
                                className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRoleId(null)}
                                className="px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingRoleId(role.id!)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setManageRolesModalOpen(false);
                  setEditingRoleId(null);
                  setDeletingRoleId(null);
                  setIsAddingRole(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE DEPARTMENTS MODAL (CREATE, EDIT & DELETE DEPARTMENTS) */}
      {/* ========================================================================= */}
      {manageDeptsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manage Departments</h3>
                  <p className="text-[11px] text-slate-500">
                    Create, rename, or delete organizational departments & teams.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDept(!isAddingDept)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Dept</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManageDeptsModalOpen(false);
                    setEditingDeptId(null);
                    setDeletingDeptId(null);
                    setIsAddingDept(false);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[65vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 pr-3">
              {/* Inline Department Creator */}
              {isAddingDept && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>Create New Department</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDept(false);
                        setNewDeptName("");
                      }}
                      className="text-indigo-400 hover:text-indigo-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Department Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Quality Assurance, Operations, Sales"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDept(false);
                        setNewDeptName("");
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={creatingDept || !newDeptName.trim()}
                      onClick={handleQuickCreateDepartment}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      {creatingDept && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Save Department</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Departments List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Existing Departments ({teams.length})
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No departments created yet.
                  </div>
                ) : (
                  teams.map((dept) => {
                    const isEditingThis = editingDeptId === dept.id;
                    const isDeletingThis = deletingDeptId === dept.id;

                    if (isEditingThis) {
                      return (
                        <div
                          key={dept.id}
                          className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-3 shadow-2xs animate-in fade-in"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              Edit Department: {dept.name}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Department Name
                              </label>
                              <input
                                type="text"
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Description (Optional)
                              </label>
                              <input
                                type="text"
                                placeholder="Short description"
                                value={editDeptDescription}
                                onChange={(e) => setEditDeptDescription(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => setEditingDeptId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading || !editDeptName.trim()}
                              onClick={handleUpdateDepartment}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl transition-all shadow-2xs group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{dept.name}</span>
                              {dept._count?.users !== undefined && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {dept._count.users} {dept._count.users === 1 ? "member" : "members"}
                                </span>
                              )}
                            </div>
                            {dept.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {dept.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingDept(dept)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isDeletingThis ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in">
                              <span className="text-[10px] font-bold text-rose-700 px-1">Delete?</span>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDeptId(null)}
                                className="px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingDeptId(dept.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setManageDeptsModalOpen(false);
                  setEditingDeptId(null);
                  setDeletingDeptId(null);
                  setIsAddingDept(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
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
