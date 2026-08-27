import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  canSendNotification,
  formatDateWithPattern,
  calculateWorkingDays,
} from "@/lib/settings";
import { sendLeaveDecisionEmail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied. CEO role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const teamId = searchParams.get("teamId");
    const roleFilter = searchParams.get("roleFilter") || "ALL"; // "ADMIN" | "TL" | "EMPLOYEE" | "ALL"
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status !== "ALL") {
      if (status === "PENDING" || status === "PENDING_ADMIN") {
        where.status = "PENDING_ADMIN";
      } else if (status === "PENDING_TL") {
        where.status = "PENDING_TL";
      } else {
        where.status = status;
      }
    }

    if (roleFilter !== "ALL") {
      where.user = { ...where.user, role: roleFilter };
    }

    if (teamId && teamId !== "ALL") {
      where.user = { ...where.user, teamId: parseInt(teamId, 10) };
    }

    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [totalItems, leaves, teams, pendingAdminLeavesCount] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              team: { select: { id: true, name: true } },
            },
          },
          leaveType: {
            select: { id: true, name: true, code: true },
          },
          approver: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip,
        take: limit,
      }),

      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.leaveRequest.count({
        where: {
          status: "PENDING_ADMIN",
          user: { role: "ADMIN" },
        },
      }),
    ]);

    const formattedLeaves = leaves.map((l) => {
      const isExecutiveScope =
        (l.status === "PENDING_ADMIN" && Boolean(l.escalatedById)) ||
        l.user.role === "ADMIN" ||
        l.user.role === "TL";
      const diffMs = new Date(l.endDate).getTime() - new Date(l.startDate).getTime();
      const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      return {
        id: l.id,
        userId: l.user.id,
        employeeName: l.user.name,
        employeeEmail: l.user.email,
        roleName: l.user.role,
        teamName: l.user.team?.name || "Unassigned",
        leaveTypeId: l.leaveType.id,
        leaveTypeName: l.leaveType.name,
        leaveTypeCode: l.leaveType.code,
        startDate: l.startDate,
        endDate: l.endDate,
        duration,
        reason: l.reason,
        status: l.status,
        rejectionReason: l.rejectionReason,
        approverName: l.approver?.name || null,
        isExecutiveScope,
        createdAt: l.createdAt,
      };
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return NextResponse.json({
      success: true,
      leaves: formattedLeaves,
      teams,
      pendingAdminLeavesCount,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("CEO Leaves API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load leave requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied. CEO role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, rejectionReason } = body;

    if (!id || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid leave request decision parameters" },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        leaveType: { select: { name: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { fromDate: { lte: leaveRequest.endDate }, toDate: { gte: leaveRequest.startDate } },
          { date: { gte: leaveRequest.startDate, lte: leaveRequest.endDate } },
        ],
      },
    });

    const isHalfDay = leaveRequest.reason?.toLowerCase().includes("[half day]") || false;
    const duration = calculateWorkingDays({
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      isHalfDay,
      holidays,
    });

    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(leaveRequest.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(leaveRequest.endDate, settings.dateFormat, settings.timezone);
    const reviewerId = Number(session.user.id);
    const now = new Date();

    // Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Leave Request status & approver fields
      await tx.leaveRequest.update({
        where: { id: leaveRequest.id },
        data: {
          status,
          approverId: reviewerId,
          approverRole: "CEO",
          approvedAt: status === "APPROVED" ? now : null,
          rejectedAt: status === "REJECTED" ? now : null,
          rejectionReason: status === "REJECTED" ? rejectionReason?.trim() || "Declined by CEO" : null,
        },
      });

      // 2. If approved, adjust leave balance
      if (status === "APPROVED") {
        const currentYear = new Date(leaveRequest.startDate).getFullYear();
        const balance = await tx.leaveBalance.findFirst({
          where: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: currentYear,
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: { increment: duration },
              remaining: { decrement: duration },
            },
          });
        }
      }

      // 3. Create In-App Notification for applicant
      await tx.notification.create({
        data: {
          userId: leaveRequest.userId,
          title: `Leave ${status === "APPROVED" ? "Approved" : "Rejected"} by CEO`,
          message: `Your ${leaveRequest.leaveType.name} application (${formattedStart} - ${formattedEnd}) has been ${status.toLowerCase()} by the CEO.${
            status === "REJECTED" && rejectionReason ? ` Remarks: ${rejectionReason}` : ""
          }`,
        },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: `CEO_LEAVE_${status}`,
          entity: "LeaveRequest",
          entityId: leaveRequest.id,
          details: `CEO ${session.user.name} ${status.toLowerCase()} leave #${leaveRequest.id} for ${leaveRequest.user.name} (${leaveRequest.user.role})`,
        },
      });
    });

    // 5. Send Decision Email to applicant (Async / Non-blocking)
    if (leaveRequest.user.email) {
      sendLeaveDecisionEmail({
        employeeName: leaveRequest.user.name,
        employeeEmail: leaveRequest.user.email,
        leaveType: leaveRequest.leaveType.name,
        startDate: formattedStart,
        endDate: formattedEnd,
        days: duration,
        status: status as "APPROVED" | "REJECTED",
        reviewerName: session.user.name || "Chief Executive Officer",
        reviewerRole: "CEO",
        rejectionReason: status === "REJECTED" ? rejectionReason?.trim() : undefined,
        settings,
      }).catch((err) => console.warn("Async CEO leave decision email failed:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Leave request successfully ${status.toLowerCase()}!`,
    });
  } catch (error: any) {
    console.error("CEO Leave decision error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process leave decision" },
      { status: 500 }
    );
  }
}
