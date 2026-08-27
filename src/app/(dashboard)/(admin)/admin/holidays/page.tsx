"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Edit2, Trash2, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UPCOMING" | "PAST">("UPCOMING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form & modal error state
  const [formData, setFormData] = useState({ name: "", fromDate: "", toDate: "" });
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchHolidays = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status: filterStatus,
      });

      const res = await fetch(`/api/admin/holidays?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalFiltered ?? data.pagination.total ?? 0);
        }
      } else {
        showToast(data.error || "Failed to fetch holidays", "error");
      }
    } catch (error) {
      console.error("Failed to fetch holidays", error);
      showToast("Network error fetching holidays", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatInputDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  const getDaysCount = (from: string, to: string) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleOpenModal = (holiday?: any) => {
    setModalError(null);
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        fromDate: formatInputDate(holiday.fromDate),
        toDate: formatInputDate(holiday.toDate),
      });
    } else {
      setEditingHoliday(null);
      setFormData({ name: "", fromDate: "", toDate: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHoliday(null);
    setModalError(null);
    setFormData({ name: "", fromDate: "", toDate: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim() || !formData.fromDate || !formData.toDate) {
      setModalError("Holiday name, from date, and to date are required.");
      return;
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      setModalError("End date cannot be earlier than start date.");
      return;
    }

    try {
      setIsSaving(true);
      const url = editingHoliday
        ? `/api/admin/holidays/${editingHoliday.id}`
        : "/api/admin/holidays";

      const method = editingHoliday ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        showToast(editingHoliday ? "Holiday updated successfully!" : "Holiday created successfully!");
        handleCloseModal();
        fetchHolidays();
      } else {
        setModalError(data.error || "Failed to save holiday");
        showToast(data.error || "Failed to save holiday", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      setModalError("An error occurred while saving the holiday.");
      showToast("Network error saving holiday", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setHolidayToDelete(id);
  };

  const executeDelete = async () => {
    if (!holidayToDelete) return;

    try {
      const res = await fetch(`/api/admin/holidays/${holidayToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showToast("Holiday deleted successfully!");
        setHolidayToDelete(null);
        fetchHolidays();
      } else {
        showToast(data.error || "Failed to delete holiday", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("An error occurred while deleting the holiday", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
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

      {/* 1. TOP HEADER & FILTER BOX */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Company Holidays
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official company holiday schedule and non-working days.
          </p>
        </div>

        {/* Right Controls: Filter Tabs + Create Button */}
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
              All
            </button>
            <button
              onClick={() => {
                setFilterStatus("UPCOMING");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "UPCOMING"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => {
                setFilterStatus("PAST");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                filterStatus === "PAST"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Past
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Holiday</span>
          </button>
        </div>
      </div>

      {/* 2. HOLIDAYS TABLE UI */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs relative">
        <div className="overflow-x-auto min-h-[220px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-xs">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Holiday Name</th>
                <th className="py-3.5 px-4">From Date</th>
                <th className="py-3.5 px-4">To Date</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {!isLoading && holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No company holidays found for the selected filter.
                  </td>
                </tr>
              ) : (
                holidays.map((h) => {
                  const days = getDaysCount(h.fromDate, h.toDate);
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-slate-900">
                            {h.name}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.fromDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.toDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 whitespace-nowrap">
                          {days} {days === 1 ? "Day" : "Days"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenModal(h)}
                            title="Edit Holiday"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => confirmDelete(h.id.toString())}
                            title="Delete Holiday"
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

        {/* Pagination Footer */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 border-t border-slate-200/80 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span> to{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * 10, totalItems)}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> holidays
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

      {/* CREATE / EDIT HOLIDAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 relative"
          >
            {isSaving && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-xs rounded-2xl">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            )}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{editingHoliday ? "Edit Company Holiday" : "Create New Holiday"}</span>
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Year's Day, Independence Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  label="From Date"
                  required
                  value={formData.fromDate}
                  disabled={isSaving}
                  onChange={(val) =>
                    setFormData((f) => ({
                      ...f,
                      fromDate: val,
                      toDate: f.toDate && val > f.toDate ? val : f.toDate,
                    }))
                  }
                />

                <DatePicker
                  label="To Date"
                  required
                  align="right"
                  value={formData.toDate}
                  minDate={formData.fromDate}
                  disabled={isSaving}
                  onChange={(val) => setFormData((f) => ({ ...f, toDate: val }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs transition-all active:scale-95 cursor-pointer"
                disabled={isSaving}
              >
                {editingHoliday ? "Save Changes" : "Create Holiday"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Holiday</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this company holiday? This action will remove it from the official calendar.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setHolidayToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
