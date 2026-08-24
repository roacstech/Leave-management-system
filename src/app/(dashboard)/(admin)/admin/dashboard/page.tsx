"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import UnifiedLeavePortal, { LeaveRecord } from "@/components/leave/UnifiedLeavePortal";
import OrganizationRequestsTable, { PendingLeaveRequest } from "@/components/leave/OrganizationRequestsTable";
import { LeaveBalanceItem } from "@/components/leave/QuickStatisticsSidebar";
import { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Own Leave Balances & Records (Slide 7)
  const [myBalances, setMyBalances] = useState<LeaveBalanceItem[]>([]);
  const [myLeaveTypes, setMyLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [myRecords, setMyRecords] = useState<LeaveRecord[]>([]);

  // Staff Requests (Slide 5)
  const [staffRequests, setStaffRequests] = useState<PendingLeaveRequest[]>([]);

  // Key stats
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    totalStaff: 0,
    approvedLeaves: 0,
    presentToday: 0,
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch own leaves and balances
      const myLeavesRes = await fetch("/api/employee/dashboard");
      if (myLeavesRes.ok) {
        const myData = await myLeavesRes.json();
        if (myData.balances && Array.isArray(myData.balances)) {
          setMyBalances(
            myData.balances.map((b: any) => ({
              name: b.name,
              code: b.code,
              availed: b.used,
              balance: b.remaining,
            }))
          );
          setMyLeaveTypes(
            myData.balances.map((b: any) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              balance: b.remaining,
            }))
          );
        }

        if (myData.recentLeaves && Array.isArray(myData.recentLeaves)) {
          setMyRecords(
            myData.recentLeaves.map((l: any) => {
              const start = new Date(l.startDate);
              const end = new Date(l.endDate);
              const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const formatShort = (d: Date) =>
                d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

              return {
                id: l.id,
                leaveType: l.leaveType?.name || "Leave",
                code: l.leaveType?.code || "LV",
                from: formatShort(start),
                to: formatShort(end),
                appliedDays: days,
                reversedDays: 0,
                totalDays: days,
                status:
                  l.status === "APPROVED"
                    ? "Approved"
                    : l.status === "REJECTED"
                    ? "Rejected"
                    : "Pending",
                reason: l.reason,
              };
            })
          );
        }
      }

      // 2. Fetch staff requests & org stats
      const adminRes = await fetch("/api/admin/dashboard");
      if (adminRes.ok) {
        const adminData = await adminRes.json();

        setStats({
          pendingApprovals: adminData.stats?.pendingLeaves || 0,
          totalStaff: adminData.stats?.allUsersCount || 0,
          approvedLeaves: adminData.stats?.approvedLeaves || 0,
          presentToday: adminData.stats?.todayAttendance?.presentCount || 0,
        });

        if (adminData.recentLeaves && Array.isArray(adminData.recentLeaves)) {
          setStaffRequests(
            adminData.recentLeaves.map((r: any) => {
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const formatShort = (d: Date) =>
                d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

              return {
                id: r.id,
                userId: r.userId,
                applicantName: r.user?.name || "Employee",
                applicantEmail: r.user?.email || "",
                applicantRole: r.user?.role || "STAFF",
                teamName: r.user?.team?.name || null,
                leaveType: r.leaveType?.name || "Leave",
                startDate: formatShort(start),
                endDate: formatShort(end),
                days,
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt,
              };
            })
          );
        }
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Approve
  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/leave-requests/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverRole: "ADMIN" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve request.");
      }

      showToast("Leave request approved successfully!");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "An error occurred while approving.", "error");
    }
  };

  // Handle Reject
  const handleReject = async (id: number, reason: string) => {
    try {
      const res = await fetch(`/api/leave-requests/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason, approverRole: "ADMIN" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject request.");
      }

      showToast("Leave request declined.");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "An error occurred while rejecting.", "error");
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast toast-top toast-end z-50">
          <div
            className={`alert ${
              toastMessage.type === "success" ? "alert-success" : "alert-error"
            } text-xs font-bold shadow-lg`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: "My Leave Portal" (Slide 7 - Official PDF Layout) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-extrabold text-base-content tracking-wide uppercase">
            My Leave Application & Records
          </h2>
        </div>

        <UnifiedLeavePortal
          title="My Leave Portal"
          balances={myBalances}
          leaveTypes={myLeaveTypes}
          records={myRecords}
          onRefresh={fetchData}
          userRole="ADMIN"
        />
      </div>

      {/* SECTION 2: "Staff Leave Approvals" (Slide 5 - Organization Requests) */}
      <div className="space-y-3 pt-4 border-t border-base-300/80">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-extrabold text-base-content tracking-wide uppercase">
            Staff Leave Requests & Approvals
          </h2>
        </div>

        <OrganizationRequestsTable
          title="Pending Approval Queue"
          requests={staffRequests}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={loading}
        />
      </div>
    </div>
  );
}