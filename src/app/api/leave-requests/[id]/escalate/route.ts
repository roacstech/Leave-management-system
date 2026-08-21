import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings, formatDateWithPattern } from "@/lib/settings";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/leave-requests/[id]/escalate
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const leaveRequestId = Number(id);
    if (isNaN(leaveRequestId)) {
      return NextResponse.json({ success: false, error: "Invalid leave request ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || body?.escalationReason?.trim() || body?.escalationNote?.trim();

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "An escalation reason is required." },
        { status: 400 }
      );
    }

    const userRole = session.user.role;
    const userId = Number(session.user.id);
    const userName = session.user.name || "Team Leader";

    // Fetch existing leave request
    const existing = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          include: {
            team: true,
          },
        },
        leaveType: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    if (userRole === "EMPLOYEE") {
      return NextResponse.json({ success: false, error: "Employees cannot escalate leave requests." }, { status: 403 });
    }

    if (userRole === "TL") {
      const isAssignedTL =
        (existing.user.team && existing.user.team.tlId === userId) ||
        existing.user.reportingToId === userId;

      if (!isAssignedTL) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not the assigned Team Lead for this employee." },
          { status: 403 }
        );
      }

      if (existing.status !== "PENDING") {
        return NextResponse.json(
          { success: false, error: `Cannot escalate: Request is currently in ${existing.status} status.` },
          { status: 400 }
        );
      }
    }

    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);
    const daysDiff = Math.max(
      1,
      Math.round(
        (new Date(existing.endDate).getTime() - new Date(existing.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );

    // Update in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "ESCALATED",
          escalatedById: userId,
          escalatedAt: new Date(),
          escalationReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: userId,
          action: "LEAVE_REQUEST_ESCALATED",
          entity: "LeaveRequest",
          entityId: leaveRequestId,
          details: JSON.stringify({
            leaveRequestId,
            employeeId: existing.userId,
            employeeName: existing.user.name,
            escalatedBy: userId,
            escalatedByName: userName,
            escalationReason: reason,
            oldStatus: existing.status,
            newStatus: "ESCALATED",
          }),
        },
      });

      return req;
    });

    // 1. Notify all active Admins
    const activeAdmins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "CEO"] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const admin of activeAdmins) {
      await createNotification({
        userId: admin.id,
        type: "LEAVE_ESCALATED",
        title: "Leave Request Escalated",
        message: `${userName} escalated ${existing.user.name}'s ${existing.leaveType.name} request for ${formattedStart} - ${formattedEnd} (${daysDiff} day${daysDiff > 1 ? "s" : ""}). Reason: ${reason}`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });
    }

    // 2. Notify Employee that request was forwarded to Admin
    await createNotification({
      userId: existing.userId,
      type: "LEAVE_ESCALATED",
      title: "Leave Request Escalated",
      message: `Your ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}) has been forwarded to Admin for further approval.`,
      entityType: "LEAVE_REQUEST",
      entityId: leaveRequestId,
    });

    return NextResponse.json({
      success: true,
      message: `Leave request #${leaveRequestId} has been escalated to Administration.`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Escalate leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to escalate leave request" },
      { status: 500 }
    );
  }
}
