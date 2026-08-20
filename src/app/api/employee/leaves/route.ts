import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  canSendNotification,
  formatDateWithPattern,
  validateLeaveApplication,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

// POST submit a new leave application
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Leave type, start date, and end date are required." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format." },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { success: false, error: "End date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    const daysDiff = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const requestedDays = isHalfDay ? 0.5 : daysDiff;

    const settings = await getSystemSettings();
    const currentYear = new Date().getFullYear();

    // Check balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: Number(leaveTypeId),
          year: currentYear,
        },
      },
      include: {
        leaveType: true,
      },
    });

    const currentRemaining = balance ? balance.remaining : 0;

    const validation = validateLeaveApplication({
      startDate: start,
      endDate: end,
      isHalfDay: Boolean(isHalfDay),
      requestedDays,
      currentBalance: currentRemaining,
      settings,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Leave validation failed." },
        { status: 400 }
      );
    }

    // Create Leave Request in Prisma
    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId: Number(leaveTypeId),
        startDate: start,
        endDate: end,
        reason: reason?.trim() || null,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
          },
        },
        leaveType: true,
      },
    });

    // Notify Team Leader & Admins
    if (canSendNotification("NEW_LEAVE_REQUEST", "IN_APP", settings)) {
      try {
        const recipients = await prisma.user.findMany({
          where: {
            OR: [
              { role: "ADMIN", isActive: true },
              { role: "CEO", isActive: true },
              ...(newRequest.user.teamId
                ? [{ teamId: newRequest.user.teamId, role: "TL" as const, isActive: true }]
                : []),
            ],
          },
          select: { id: true },
        });

        const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
        const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

        for (const recipient of recipients) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "New Leave Application",
              message: `${newRequest.user.name} applied for ${requestedDays} day(s) of ${newRequest.leaveType.name} (${formattedStart} - ${formattedEnd}).`,
            },
          });
        }
      } catch (notifErr) {
        console.warn("Could not send leave notification:", notifErr);
      }
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "EMPLOYEE_APPLY_LEAVE",
          entity: "LeaveRequest",
          entityId: newRequest.id,
          details: `Employee submitted a ${newRequest.leaveType.name} application for ${requestedDays} day(s)`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Could not create audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Leave application submitted successfully!",
      leaveRequest: newRequest,
    });
  } catch (error: any) {
    console.error("Apply leave error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit leave application" },
      { status: 500 }
    );
  }
}

// PATCH cancel own pending leave request
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Leave request ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: {
        id: Number(id),
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Leave request not found or not authorized to cancel." },
        { status: 404 }
      );
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Only PENDING leave requests can be cancelled." },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Leave request has been cancelled.",
      leaveRequest: updated,
    });
  } catch (error: any) {
    console.error("Cancel leave error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel leave request" },
      { status: 500 }
    );
  }
}
