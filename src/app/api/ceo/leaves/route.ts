import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  canSendNotification,
  formatDateWithPattern,
} from "@/lib/settings";
import { sendLeaveDecisionEmail } from "@/lib/mail";

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
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (teamId && teamId !== "ALL") {
      where.user = { teamId: parseInt(teamId, 10) };
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

    const [leaves, teams] = await Promise.all([
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
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const formattedLeaves = leaves.map((l) => {
      const isExecutiveScope = l.status === "ESCALATED" || l.user.role === "ADMIN" || l.user.role === "TL";
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
        isExecutiveScope,
        createdAt: l.createdAt,
      };
    });

    const pendingExecutiveCount = formattedLeaves.filter(
      (l) => l.isExecutiveScope && (l.status === "PENDING" || l.status === "ESCALATED")
    ).length;

    return NextResponse.json({
      success: true,
      leaves: formattedLeaves,
      teams,
      pendingExecutiveCount,
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
        user: { select: { id: true, name: true, email: true } },
        leaveType: { select: { name: true } },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
    }

    const diffMs = new Date(leaveRequest.endDate).getTime() - new Date(leaveRequest.startDate).getTime();
    const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(leaveRequest.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(leaveRequest.endDate, settings.dateFormat, settings.timezone);

    // Execute atomic update
    await prisma.$transaction(async (tx) => {
      // 1. Update Leave Request status
      await tx.leaveRequest.update({
        where: { id: leaveRequest.id },
        data: {
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason?.trim() || "Declined by Executive" : null,
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

      // 3. Create In-App Notification for Employee
      if (canSendNotification(status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED", "IN_APP", settings)) {
        await tx.notification.create({
          data: {
            userId: leaveRequest.userId,
            title: `Leave ${status === "APPROVED" ? "Approved" : "Rejected"} by CEO`,
            message: `Your ${leaveRequest.leaveType.name} request for ${duration} day(s) was ${status.toLowerCase()} by executive management.${
              status === "REJECTED" && rejectionReason ? ` Reason: ${rejectionReason}` : ""
            }`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: Number(session.user.id),
          action: `CEO_LEAVE_${status}`,
          entity: "LeaveRequest",
          entityId: leaveRequest.id,
          details: `CEO ${session.user.name} ${status.toLowerCase()} leave #${leaveRequest.id} for ${leaveRequest.user.name}`,
        },
      });
    });

    // 5. Send Decision Email to Employee (Async / Non-blocking)
    if (
      canSendNotification(status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED", "EMAIL", settings) &&
      leaveRequest.user.email
    ) {
      sendLeaveDecisionEmail({
        employeeName: leaveRequest.user.name,
        employeeEmail: leaveRequest.user.email,
        leaveType: leaveRequest.leaveType.name,
        startDate: formattedStart,
        endDate: formattedEnd,
        days: duration,
        status: status as "APPROVED" | "REJECTED",
        reviewerName: session.user.name || "Executive Management",
        reviewerRole: "CEO",
        rejectionReason: status === "REJECTED" ? rejectionReason?.trim() : undefined,
        settings,
      }).catch((err) => console.warn("Async CEO leave decision email failed:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Leave request #${id} ${status.toLowerCase()} successfully!`,
    });
  } catch (error: any) {
    console.error("CEO Leave Decision error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process leave decision" },
      { status: 500 }
    );
  }
}
