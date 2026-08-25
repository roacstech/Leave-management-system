"use client";

import React, { useEffect, useState, useCallback } from "react";
import UnifiedLeavePortal, { LeaveRecord } from "@/components/leave/UnifiedLeavePortal";
import { LeaveBalanceItem } from "@/components/leave/QuickStatisticsSidebar";
import { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

export default function EmployeeMyLeavesPage() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);

  const fetchMyData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard");
      if (res.ok) {
        const data = await res.json();

        const rawBalances = data.leaveBalances || data.balances || [];
        if (Array.isArray(rawBalances) && rawBalances.length > 0) {
          setBalances(
            rawBalances.map((b: any) => ({
              name: b.leaveType?.name || b.name || "Leave",
              code: b.leaveType?.code || b.code || "LV",
              availed: b.used ?? 0,
              balance: b.remaining ?? (b.total - b.used),
            }))
          );
          setLeaveTypes(
            rawBalances.map((b: any) => ({
              id: b.leaveType?.id || b.id,
              name: b.leaveType?.name || b.name || "Leave",
              code: b.leaveType?.code || b.code || "LV",
              balance: b.remaining ?? (b.total - b.used),
              availed: b.used ?? 0,
            }))
          );
        }

        const rawLeaves = data.recentRequests || data.recentLeaves || [];
        if (Array.isArray(rawLeaves)) {
          setRecords(
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
    } catch (err) {
      console.error("Failed to load employee my-leaves data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <UnifiedLeavePortal
        title="My Leave Application & Records"
        balances={balances}
        leaveTypes={leaveTypes}
        records={records}
        onRefresh={fetchMyData}
        userRole="EMPLOYEE"
      />
    </div>
  );
}