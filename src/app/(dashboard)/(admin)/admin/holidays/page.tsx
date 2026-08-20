"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Plus, Edit2, Trash2, X, Search, Loader2 } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UPCOMING" | "PAST">("UPCOMING");
  
  // Form state
  const [formData, setFormData] = useState({ name: "", fromDate: "", toDate: "" });

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/holidays");
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays);
      }
    } catch (error) {
      console.error("Failed to fetch holidays", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Helper for input type="date" values
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
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({ 
        name: holiday.name, 
        fromDate: formatInputDate(holiday.fromDate), 
        toDate: formatInputDate(holiday.toDate) 
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
    setFormData({ name: "", fromDate: "", toDate: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.fromDate || !formData.toDate) return;
    
    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      alert("End date cannot be before start date.");
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
        if (editingHoliday) {
          setHolidays(holidays.map(h => h.id === editingHoliday.id ? data.holiday : h));
        } else {
          setHolidays([...holidays, data.holiday]);
        }
        handleCloseModal();
      } else {
        alert(data.error || "Failed to save holiday");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred while saving the holiday.");
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
        setHolidays(holidays.filter(h => h.id !== parseInt(holidayToDelete, 10)));
        setHolidayToDelete(null);
      } else {
        alert(data.error || "Failed to delete holiday");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred while deleting the holiday.");
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAndSortedHolidays = holidays
    .filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === "ALL") return true;

      const holidayDate = new Date(h.fromDate);
      holidayDate.setHours(0, 0, 0, 0);

      if (filterStatus === "UPCOMING") return holidayDate >= today;
      if (filterStatus === "PAST") return holidayDate < today;

      return true;
    })
    .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());

  return (
    <div className="space-y-5">
      {/* UNIFIED HEADER & FILTER BOX */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Company Holidays
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage official company holiday schedule and non-working days.
            </p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Holiday</span>
          </button>
        </div>

        {/* Clean Divider */}
        <div className="h-px bg-slate-100" />

        {/* Bottom Section: Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-0.5">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by holiday name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "ALL"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus("UPCOMING")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "UPCOMING"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilterStatus("PAST")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === "PAST"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Past
            </button>
          </div>
        </div>
      </div>

      {/* HOLIDAYS TABLE UI */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs relative">
        <div className="overflow-x-auto min-h-[200px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Holiday Name</th>
                <th className="py-3 px-3">From Date</th>
                <th className="py-3 px-3">To Date</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {!isLoading && filteredAndSortedHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No holidays found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedHolidays.map((h) => {
                  const days = getDaysCount(h.fromDate, h.toDate);
                  const isMultiDay = days > 1;
                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="font-semibold text-slate-900">
                            {h.name}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.fromDate)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateString(h.toDate)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 whitespace-nowrap">
                          {days} {days === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenModal(h)}
                            title="Edit Holiday"
                            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => confirmDelete(h.id.toString())}
                            title="Delete Holiday"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT HOLIDAY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-3.5 relative"
          >
            {isSaving && (
               <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl">
                 <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
               </div>
            )}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingHoliday ? "Edit Holiday" : "Create New Holiday"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Holiday Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Year's Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
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
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Holiday</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this holiday? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setHolidayToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-sm transition-colors"
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
