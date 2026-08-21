"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  ExternalLink,
  Loader2,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "LEAVE_REQUEST":
      return <Calendar className="w-4 h-4 text-amber-600" />;
    case "LEAVE_APPROVED":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "LEAVE_REJECTED":
      return <XCircle className="w-4 h-4 text-rose-600" />;
    case "LEAVE_ESCALATED":
      return <ArrowUpRight className="w-4 h-4 text-purple-600" />;
    case "LEAVE_CANCELLED":
      return <UserX className="w-4 h-4 text-slate-500" />;
    case "SYSTEM":
    default:
      return <Info className="w-4 h-4 text-blue-600" />;
  }
}

function getNotificationBadgeClass(type: NotificationItem["type"]) {
  switch (type) {
    case "LEAVE_REQUEST":
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    case "LEAVE_APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "LEAVE_REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200/80";
    case "LEAVE_ESCALATED":
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    case "LEAVE_CANCELLED":
      return "bg-slate-100 text-slate-700 border-slate-200/80";
    case "SYSTEM":
    default:
      return "bg-blue-50 text-blue-700 border-blue-200/80";
  }
}

export function NotificationBell() {
  const sessionResult = useSession?.();
  const session = sessionResult?.data;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const [pulse, setPulse] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const userId = session?.user?.id ? Number(session.user.id) : null;
  const userRole = session?.user?.role;

  // 1. Fetch unread count & initial recent notifications
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.warn("Error fetching unread count:", err);
    }
  }, [userId]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      console.warn("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 2. Setup Socket.IO connection
  useEffect(() => {
    if (!userId) return;

    fetchUnreadCount();

    // Determine socket server host
    const socketHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const socketUrl = `http://${socketHost}:3002`;

    try {
      const socket = io(socketUrl, {
        query: { userId: String(userId) },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join", { userId });
      });

      // Handle new notification event
      socket.on("notification:new", (data: { notification: NotificationItem; unreadCount: number }) => {
        if (data?.notification) {
          setNotifications((prev) => [data.notification, ...prev.filter((n) => n.id !== data.notification.id)]);
        }
        if (typeof data?.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((c) => c + 1);
        }

        // Trigger bell visual pulse
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
      });

      // Handle unread count update
      socket.on("notification:unread_count", (data: { count: number }) => {
        if (typeof data?.count === "number") {
          setUnreadCount(data.count);
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Socket.IO client setup error:", err);
    }
  }, [userId, fetchUnreadCount]);

  // Periodic polling fallback (every 30s)
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Mark single notification as read
  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  // Click on notification item
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      handleMarkAsRead({ stopPropagation: () => {} } as any, notif.id);
    }
    setIsOpen(false);

    // Route based on role and entity
    if (userRole === "TL") {
      router.push("/tl/leave-requests");
    } else if (userRole === "ADMIN") {
      router.push("/admin/leaves");
    } else if (userRole === "CEO") {
      router.push("/ceo/leave-management");
    } else {
      router.push("/employee/my-leaves");
    }
  };

  const getNotificationsPageRoute = () => {
    if (userRole === "TL") return "/tl/notifications";
    if (userRole === "ADMIN") return "/admin/notifications";
    if (userRole === "CEO") return "/ceo/notifications";
    return "/employee/notifications";
  };

  const filteredNotifications = notifications.filter((n) => {
    if (tab === "UNREAD") return !n.isRead;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Bell Button (Light Theme) */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
          isOpen ? "bg-slate-100 text-slate-900 shadow-2xs" : ""
        } ${pulse ? "animate-bounce" : ""}`}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4 transition-transform active:scale-95 text-slate-600" />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full shadow-xs border-2 border-white animate-in fade-in zoom-in duration-200"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Menu (Light Theme) */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 tracking-tight">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors font-semibold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Tab Filter */}
          <div className="flex items-center px-4 py-2 border-b border-slate-100 bg-white">
            <div className="flex items-center p-0.5 bg-slate-100/90 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setTab("ALL")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  tab === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTab("UNREAD")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab === "UNREAD"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                )}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs font-medium text-slate-500">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="p-3 rounded-full bg-slate-100 mb-2 border border-slate-200/60">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {tab === "UNREAD" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tab === "UNREAD"
                    ? "You are all caught up!"
                    : "Leave updates and alerts will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-3.5 transition-all duration-150 cursor-pointer ${
                    !notif.isRead
                      ? "bg-blue-50/30 hover:bg-blue-50/50"
                      : "bg-white hover:bg-slate-50/80"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex-shrink-0 p-1.5 rounded-xl border ${getNotificationBadgeClass(
                      notif.type
                    )}`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !notif.isRead ? "text-slate-900 font-bold" : "text-slate-700 font-semibold"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 flex items-center gap-1 font-medium">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Actions & Unread indicator */}
                  <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                    {!notif.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-600 shadow-xs"
                        title="Unread"
                      />
                    )}
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(getNotificationsPageRoute());
              }}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 transition-colors w-full py-1.5 rounded-lg cursor-pointer"
            >
              <span>View All Notifications</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
