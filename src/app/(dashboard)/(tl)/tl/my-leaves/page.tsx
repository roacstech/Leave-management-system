"use client";

import React, { useEffect, useState, useCallback } from "react";
import UnifiedLeavePortal, { LeaveRecord } from "@/components/leave/UnifiedLeavePortal";
import { LeaveBalanceItem } from "@/components/leave/QuickStatisticsSidebar";
import { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

export default function MyLeavePage() {
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Own Leave Balances & Records
  const [myBalances, setMyBalances] = useState<LeaveBalanceItem[]>([]);
  const [myLeaveTypes, setMyLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [myRecords, setMyRecords] = useState<LeaveRecord[]>([]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch own leaves and balances
      const myLeavesRes = await fetch("/api/employee/dashboard");
      if (myLeavesRes.ok) {
        const myData = await myLeavesRes.json();
        const rawBalances = myData.leaveBalances || myData.balances || [];
        if (Array.isArray(rawBalances) && rawBalances.length > 0) {
          setMyBalances(
            rawBalances.map((b: any) => ({
              name: b.leaveType?.name || b.name || "Leave",
              code: b.leaveType?.code || b.code || "LV",
              availed: b.used ?? 0,
              balance: b.remaining ?? (b.total - b.used),
            }))
          );
          setMyLeaveTypes(
            rawBalances.map((b: any) => ({
              id: b.leaveType?.id || b.id,
              name: b.leaveType?.name || b.name || "Leave",
              code: b.leaveType?.code || b.code || "LV",
              balance: b.remaining ?? (b.total - b.used),
              availed: b.used ?? 0,
              requiresAttachment: Boolean(b.leaveType?.requiresAttachment ?? b.requiresAttachment),
            }))
          );
        }

        const rawLeaves = myData.recentRequests || myData.recentLeaves || [];
        if (Array.isArray(rawLeaves)) {
          setMyRecords(
            rawLeaves.map((l: any) => {
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
    } catch (err: any) {
      console.error("Manager dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-300">
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

      {/* SECTION 1: "My Leave Portal" */}
      <div>
        <UnifiedLeavePortal
          title="My Leave Portal"
          balances={myBalances}
          leaveTypes={myLeaveTypes}
          records={myRecords}
          onRefresh={fetchData}
          userRole="TL"
        />
      </div>

    </div>
  );
}
