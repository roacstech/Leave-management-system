"use client";

import React, { useEffect, useState, useCallback } from "react";
import UnifiedLeavePortal, { LeaveRecord } from "@/components/leave/UnifiedLeavePortal";
import { LeaveBalanceItem } from "@/components/leave/QuickStatisticsSidebar";
import { LeaveTypeOption } from "@/components/leave/ApplyLeaveDrawer";

export default function EmployeeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);

  const fetchEmployeeData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard");
      if (res.ok) {
        const data = await res.json();

        if (data.balances && Array.isArray(data.balances)) {
          setBalances(
            data.balances.map((b: any) => ({
              name: b.name,
              code: b.code,
              availed: b.used,
              balance: b.remaining,
            }))
          );
          setLeaveTypes(
            data.balances.map((b: any) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              balance: b.remaining,
            }))
          );
        }

        if (data.recentLeaves && Array.isArray(data.recentLeaves)) {
          setRecords(
            data.recentLeaves.map((l: any) => {
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
      console.error("Failed to load employee dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-100 p-5 rounded-3xl border border-base-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider rounded-md bg-primary/15 text-primary border border-primary/20">
              Staff Portal
            </span>
            <span className="text-2xs text-base-content/60 font-medium">
              Embassy of India • Washington D.C.
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-base-content tracking-tight mt-1">
            Leave Management System
          </h1>
          <p className="text-xs text-base-content/70 mt-0.5">
            View your balance summary, apply for leaves, and track application status.
          </p>
        </div>
      </div>

      {/* Main Unified Portal Component (Slide 7) */}
      <UnifiedLeavePortal
        balances={balances}
        leaveTypes={leaveTypes}
        records={records}
        onRefresh={fetchEmployeeData}
        userRole="EMPLOYEE"
      />
    </div>
  );
}