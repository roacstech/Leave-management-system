"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Inbox, Clock } from "lucide-react";

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Could not load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 25 seconds for new notifications
    const interval = setInterval(fetchNotifications, 25000);

    // Also listen to custom dashboard refresh events
    const handleRefresh = () => fetchNotifications();
    window.addEventListener("refresh-dashboard", handleRefresh);
    window.addEventListener("refresh-emp-dashboard", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-dashboard", handleRefresh);
      window.removeEventListener("refresh-emp-dashboard", handleRefresh);
    };
  }, []);

  // Close dropdown on click outside
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

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn("Mark all read error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Mark notification read error:", err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center"
        aria-label="Notifications"
        title="View Notifications"
      >
        <div className="relative inline-flex items-center justify-center">
          <Bell className="w-4.5 h-4.5 text-base-content/70" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white leading-none shadow-2xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-base-100 border border-base-300 shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 bg-base-200 border-b border-base-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-base-content uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-80 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-base-300">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-base-content/40">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-base-content/30" />
                <p className="text-xs font-medium text-base-content/70">No notifications yet</p>
                <p className="text-[11px] text-base-content/40 mt-0.5">
                  You will receive alerts here when leaves or attendance updates occur.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkOneRead(notif.id)}
                  className={`p-3.5 transition-colors cursor-pointer text-left hover:bg-base-200/70 ${
                    !notif.isRead ? "bg-primary/5" : "bg-base-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <h4
                        className={`text-xs ${
                          !notif.isRead ? "font-bold text-base-content" : "font-semibold text-base-content/80"
                        }`}
                      >
                        {notif.title}
                      </h4>
                    </div>
                    <span className="text-[10px] text-base-content/50 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-base-content/80 mt-1 leading-relaxed pl-3.5">
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-base-200 border-t border-base-300 text-center">
            <p className="text-[11px] text-base-content/50">
              Showing latest {notifications.length} alerts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
