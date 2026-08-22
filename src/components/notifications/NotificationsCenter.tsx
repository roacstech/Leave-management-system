"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  UserX,
  Info,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface NotificationItem {
  id: number;
  userId: number;
  type: "LEAVE_REQUEST" | "LEAVE_APPROVED" | "LEAVE_REJECTED" | "LEAVE_ESCALATED" | "LEAVE_CANCELLED" | "SYSTEM";
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "LEAVE_REQUEST":
      return <Calendar className="w-5 h-5 text-amber-600" />;
    case "LEAVE_APPROVED":
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case "LEAVE_REJECTED":
      return <XCircle className="w-5 h-5 text-rose-600" />;
    case "LEAVE_ESCALATED":
      return <ArrowUpRight className="w-5 h-5 text-purple-600" />;
    case "LEAVE_CANCELLED":
      return <UserX className="w-5 h-5 text-slate-500" />;
    case "SYSTEM":
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

function getBadgeDetails(type: NotificationItem["type"]) {
  switch (type) {
    case "LEAVE_REQUEST":
      return {
        label: "Leave Request",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "LEAVE_APPROVED":
      return {
        label: "Approved",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "LEAVE_REJECTED":
      return {
        label: "Rejected",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "LEAVE_ESCALATED":
      return {
        label: "Escalated",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "LEAVE_CANCELLED":
      return {
        label: "Cancelled",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "SYSTEM":
    default:
      return {
        label: "System",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      };
  }
}

export function NotificationsCenter() {
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [readFilter, setReadFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });

      if (typeFilter !== "ALL") {
        params.append("type", typeFilter);
      }

      if (readFilter === "UNREAD") {
        params.append("isRead", "false");
      } else if (readFilter === "READ") {
        params.append("isRead", "true");
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleItemClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }

    // Determine current portal and redirect to appropriate section
    if (pathname?.startsWith("/admin")) {
      router.push("/admin/leaves");
    } else if (pathname?.startsWith("/tl")) {
      router.push("/tl/leave-requests");
    } else if (pathname?.startsWith("/ceo")) {
      router.push("/ceo/leave-management");
    } else {
      router.push("/employee/my-leaves");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Stay updated with your leave applications, team escalations, and approval decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={fetchNotifications}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Read State Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg">
          {(["ALL", "UNREAD", "READ"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setReadFilter(mode);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer capitalize ${
                readFilter === mode
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {mode === "ALL" ? "All" : mode === "UNREAD" ? "Unread" : "Read"}
            </button>
          ))}
        </div>

        {/* Type Select & Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter notifications by type"
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="LEAVE_REQUEST">Leave Requests</option>
            <option value="LEAVE_APPROVED">Approvals</option>
            <option value="LEAVE_REJECTED">Rejections</option>
            <option value="LEAVE_ESCALATED">Escalations</option>
            <option value="LEAVE_CANCELLED">Cancellations</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-500">Loading your notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/60 mb-3">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {readFilter === "UNREAD"
                ? "You have no unread notifications right now."
                : "When leave requests are submitted, approved, or escalated, they will appear here."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const badge = getBadgeDetails(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`group flex items-start gap-4 p-4 sm:p-5 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                  !notif.isRead ? "bg-blue-50/20" : ""
                }`}
              >
                {/* Icon Circle */}
                <div className="flex-shrink-0 mt-0.5 p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-2xs">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </span>
                    <h3
                      className={`text-sm ${
                        !notif.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{notif.message}</p>

                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-center">
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                      }}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{notifications.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalItems}</span> notifications
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-900">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
