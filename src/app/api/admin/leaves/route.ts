import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSystemSettings,
  formatDateWithPattern,
  validateLeaveApplication,
  calculateWorkingDays,
} from "@/lib/settings";
import { sendLeaveAppliedEmail, sendLeaveDecisionEmail } from "@/lib/mail";
import { createNotification, resolveEmployeeTeamLead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET all leave requests or filter by status for Admin
// Admin sees ONLY: 1. Escalated Employee requests (PENDING_ADMIN), 2. TL Leave requests (PENDING_ADMIN), 3. Historical decisions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      user: { role: { notIn: ["ADMIN", "CEO"] } },
    };

    if (status && status !== "ALL") {
      if (status === "PENDING" || status === "PENDING_ADMIN") {
        whereClause.status = "PENDING_ADMIN";
      } else if (status === "ESCALATED") {
        whereClause.status = "PENDING_ADMIN";
        whereClause.escalatedById = { not: null };
      } else {
        whereClause.status = status;
      }
    } else {
      // By default when viewing ALL, exclude normal Employee PENDING_TL requests so Admin only sees Admin-scoped leaves
      whereClause.OR = [
        { status: "PENDING_ADMIN" },
        { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
      ];
    }

    const baseWhere: any = { user: { role: { notIn: ["ADMIN", "CEO"] } } };

    const [
      pendingAdminCount,
      escalatedCount,
      approvedCount,
      rejectedCount,
      filteredTotal,
      leaveRequests,
    ] = await Promise.all([
      // Only count PENDING_ADMIN for Admin pending metric
      prisma.leaveRequest.count({ where: { ...baseWhere, status: "PENDING_ADMIN" } }),
      prisma.leaveRequest.count({ where: { ...baseWhere, status: "PENDING_ADMIN", escalatedById: { not: null } } }),
      prisma.leaveRequest.count({ where: { ...baseWhere, status: "APPROVED" } }),
      prisma.leaveRequest.count({ where: { ...baseWhere, status: "REJECTED" } }),
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              designation: true,
              section: true,
              joiningDate: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  tl: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              reportingTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          escalatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: true,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
      }),
    ]);

    const totalAll = pendingAdminCount + approvedCount + rejectedCount;
    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    return NextResponse.json({
      success: true,
      leaveRequests,
      summary: {
        all: totalAll,
        pending: pendingAdminCount,
        escalated: escalatedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        actionable: pendingAdminCount,
      },
      pagination: {
        totalItems: filteredTotal,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Fetch leave requests error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// POST create a leave request on behalf of a user (Admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, leaveTypeId, startDate, endDate, reason, isHalfDay } = body;

    if (!userId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "User, leave type, start date, and end date are required." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found." }, { status: 404 });
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

    if (start.getDay() === 0 && end.getDay() === 0) {
      return NextResponse.json(
        { success: false, error: "Leave cannot be applied solely for Sundays." },
        { status: 400 }
      );
    }

    let workingDaysCount = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0) {
        workingDaysCount++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (workingDaysCount <= 0) {
      return NextResponse.json(
        { success: false, error: "Selected range contains no working days (Sundays only)." },
        { status: 400 }
      );
    }

    const requestedDays = isHalfDay ? 0.5 : workingDaysCount;
    const settings = await getSystemSettings();
    const currentYear = new Date().getFullYear();

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: Number(userId),
          leaveTypeId: Number(leaveTypeId),
          year: currentYear,
        },
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
        { success: false, error: validation.error || "Leave application validation failed." },
        { status: 400 }
      );
    }

    const initialStatus = targetUser.role === "EMPLOYEE" ? "PENDING_TL" : "PENDING_ADMIN";

    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId: Number(userId),
        leaveTypeId: Number(leaveTypeId),
        startDate: start,
        endDate: end,
        reason: reason || null,
        status: initialStatus,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        leaveType: true,
      },
    });

    const formattedStart = formatDateWithPattern(start, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(end, settings.dateFormat, settings.timezone);

    // Notify assigned TL if employee
    if (targetUser.role === "EMPLOYEE") {
      const tlResolution = await resolveEmployeeTeamLead(Number(userId));
      if (tlResolution.success && tlResolution.tl) {
        await createNotification({
          userId: tlResolution.tl.id,
          type: "LEAVE_REQUEST",
          title: "New Leave Request",
          message: `${newRequest.user.name} requested ${newRequest.leaveType.name} from ${formattedStart} to ${formattedEnd}.`,
          entityType: "LEAVE_REQUEST",
          entityId: newRequest.id,
        });

        if (tlResolution.tl.email) {
          sendLeaveAppliedEmail({
            applicantName: newRequest.user.name,
            applicantEmail: newRequest.user.email,
            leaveType: newRequest.leaveType.name,
            startDate: formattedStart,
            endDate: formattedEnd,
            days: requestedDays,
            reason: newRequest.reason,
            recipients: [tlResolution.tl.email],
            recipientRole: tlResolution.tl.role,
            settings,
          }).catch((err) => console.error("Error sending leave applied email to TL:", err));
        }
      }
    } else if (targetUser.role === "ADMIN" || targetUser.role === "TL") {
      // Notify CEO for Admin and TL leaves
      const ceos = await prisma.user.findMany({
        where: { role: "CEO", isActive: true },
        select: { id: true, email: true },
      });
      for (const ceo of ceos) {
        await createNotification({
          userId: ceo.id,
          type: "LEAVE_REQUEST",
          title: `New ${targetUser.role === "ADMIN" ? "Admin" : "TL"} Leave Request`,
          message: `${targetUser.role === "ADMIN" ? "Administrator" : "Team Lead"} ${newRequest.user.name} submitted a ${newRequest.leaveType.name} request (${formattedStart} - ${formattedEnd}) requiring executive approval.`,
          entityType: "LEAVE_REQUEST",
          entityId: newRequest.id,
        });
      }

      const ceoEmails = ceos.map((c) => c.email).filter(Boolean);
      if (ceoEmails.length > 0) {
        sendLeaveAppliedEmail({
          applicantName: newRequest.user.name,
          applicantEmail: newRequest.user.email,
          leaveType: newRequest.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: requestedDays,
          reason: newRequest.reason,
          recipients: ceoEmails,
          settings,
        }).catch((err) => console.error("Error sending leave applied email to CEO:", err));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Leave request submitted successfully.",
      leaveRequest: newRequest,
    });
  } catch (error: any) {
    console.error("Create leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leave request" },
      { status: 500 }
    );
  }
}

// PATCH update a leave request status (Approve / Reject) by Admin
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, rejectionReason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Leave request ID and status are required." },
        { status: 400 }
      );
    }

    const adminId = Number(session.user.id);
    const leaveRequestId = Number(id);

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
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 }
      );
    }

    // Admin can ONLY process requests that are PENDING_ADMIN
    if (existing.status === "PENDING_TL") {
      return NextResponse.json(
        { success: false, error: "This request is pending Team Lead review and cannot be processed by Admin." },
        { status: 400 }
      );
    }

    if (existing.status !== "PENDING_ADMIN") {
      return NextResponse.json(
        { success: false, error: `This leave request has already been ${existing.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const wasEscalated = Boolean(existing.escalatedById);
    const settings = await getSystemSettings();
    const formattedStart = formatDateWithPattern(existing.startDate, settings.dateFormat, settings.timezone);
    const formattedEnd = formatDateWithPattern(existing.endDate, settings.dateFormat, settings.timezone);

    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { fromDate: { lte: existing.endDate }, toDate: { gte: existing.startDate } },
          { date: { gte: existing.startDate, lte: existing.endDate } },
        ],
      },
    });

    const isHalfDay = existing.reason?.toLowerCase().includes("[half day]") || false;
    const daysDiff = calculateWorkingDays({
      startDate: existing.startDate,
      endDate: existing.endDate,
      isHalfDay,
      holidays,
    });
    const leaveYear = new Date(existing.startDate).getFullYear();

    if (status === "APPROVED") {
      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "APPROVED",
            approverId: adminId,
            approverRole: "ADMIN",
            approvedAt: new Date(),
            rejectionReason: null,
          },
        });

        // Deduct balance
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: existing.userId,
              leaveTypeId: existing.leaveTypeId,
              year: leaveYear,
            },
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: balance.used + daysDiff,
              remaining: Math.max(0, balance.total - (balance.used + daysDiff)),
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: "LEAVE_REQUEST_APPROVED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: adminId,
              actionByRole: "ADMIN",
              wasEscalated,
              oldStatus: "PENDING_ADMIN",
              newStatus: "APPROVED",
              days: daysDiff,
            }),
          },
        });

        return req;
      });

      // Notify Requester (Employee or TL)
      await createNotification({
        userId: existing.userId,
        type: "LEAVE_APPROVED",
        title: "Leave Request Approved",
        message: wasEscalated
          ? `Your escalated ${existing.leaveType.name} request (${formattedStart} - ${formattedEnd}) has been approved by Administration.`
          : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} has been approved by Admin.`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      if (existing.user.email) {
        sendLeaveDecisionEmail({
          employeeName: existing.user.name,
          employeeEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          status: "APPROVED",
          reviewerName: session.user.name || "Administration",
          reviewerRole: "Administration",
          settings,
        }).catch((err) => console.error("Error sending Admin approval email:", err));
      }

      return NextResponse.json({
        success: true,
        message: wasEscalated
          ? `Escalated leave request has been approved by Admin.`
          : `Leave request has been approved.`,
        leaveRequest: updated,
      });
    } else if (status === "REJECTED") {
      const reason = rejectionReason?.trim();
      if (!reason) {
        return NextResponse.json(
          { success: false, error: "A rejection reason is required." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "REJECTED",
            approverId: adminId,
            approverRole: "ADMIN",
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: "LEAVE_REQUEST_REJECTED",
            entity: "LeaveRequest",
            entityId: leaveRequestId,
            details: JSON.stringify({
              leaveRequestId,
              employeeId: existing.userId,
              actionBy: adminId,
              actionByRole: "ADMIN",
              wasEscalated,
              oldStatus: "PENDING_ADMIN",
              newStatus: "REJECTED",
              rejectionReason: reason,
            }),
          },
        });

        return req;
      });

      // Notify Requester (Employee or TL)
      await createNotification({
        userId: existing.userId,
        type: "LEAVE_REJECTED",
        title: "Leave Request Rejected",
        message: wasEscalated
          ? `Your escalated ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} was rejected by Admin. Reason: ${reason}`
          : `Your ${existing.leaveType.name} request from ${formattedStart} to ${formattedEnd} was rejected by Admin. Reason: ${reason}`,
        entityType: "LEAVE_REQUEST",
        entityId: leaveRequestId,
      });

      if (existing.user.email) {
        sendLeaveDecisionEmail({
          employeeName: existing.user.name,
          employeeEmail: existing.user.email,
          leaveType: existing.leaveType.name,
          startDate: formattedStart,
          endDate: formattedEnd,
          days: daysDiff,
          status: "REJECTED",
          reviewerName: session.user.name || "Administration",
          reviewerRole: "Administration",
          rejectionReason: reason,
          settings,
        }).catch((err) => console.error("Error sending Admin rejection email:", err));
      }

      return NextResponse.json({
        success: true,
        message: wasEscalated
          ? `Escalated leave request has been rejected by Admin.`
          : `Leave request has been rejected.`,
        leaveRequest: updated,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
  } catch (error: any) {
    console.error("Update leave request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
