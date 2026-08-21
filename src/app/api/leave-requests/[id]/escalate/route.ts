import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

    if (userRole !== "TL" && userRole !== "ADMIN" && userRole !== "CEO") {
      return NextResponse.json(
        { success: false, error: "Only Team Leads or Administrators can escalate leave requests." },
        { status: 403 }
      );
    }

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
    }

    if (existing.status === "PENDING_ADMIN") {
      return NextResponse.json(
        { success: false, error: "This request has already been escalated to Administration." },
        { status: 400 }
      );
    }

    if (existing.status !== "PENDING_TL") {
      return NextResponse.json(
        { success: false, error: `Only requests pending Team Lead review can be escalated. Current status: ${existing.status}` },
        { status: 400 }
      );
    }

    // Update LeaveRequest to PENDING_ADMIN in transaction with AuditLog
    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "PENDING_ADMIN",
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
            escalatedBy: userId,
            escalatedByName: userName,
            escalationReason: reason,
            oldStatus: "PENDING_TL",
            newStatus: "PENDING_ADMIN",
          }),
        },
      });

      return req;
    });

    // 1. Notify all active Administrators
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CEO"] }, isActive: true },
      select: { id: true },
    });

    for (const adm of admins) {
      await createNotification({
        userId: adm.id,
        type: "LEAVE_ESCALATED",
        title: "Leave Request Escalated",
        message: `${userName} escalated ${existing.user.name}'s leave request for Admin review. Reason: ${reason}`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });
    }

    // 2. Notify Employee
    await createNotification({
      userId: existing.userId,
      type: "LEAVE_ESCALATED",
      title: "Leave Request Escalated",
      message: `Your leave request has been forwarded to Admin for further review.`,
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
