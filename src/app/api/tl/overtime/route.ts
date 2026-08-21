import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings, canSendNotification } from "@/lib/settings";
import { sendOvertimeUpdateEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

// GET team overtime & comp-off claims for Team Leader review
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "TL" && session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, teamId: true },
    });

    const whereClause: any = {};
    if (currentUser?.role === "TL" && currentUser.teamId) {
      whereClause.user = {
        teamId: currentUser.teamId,
      };
    }

    const records = await prisma.overtimeRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const pendingClaims = records.filter((r) => r.status === "PENDING");
    const approvedClaims = records.filter((r) => r.status === "APPROVED");

    let totalApprovedOtHours = 0;
    let totalApprovedCompOffDays = 0;

    approvedClaims.forEach((r) => {
      totalApprovedOtHours += r.hours;
      if (r.claimCompOff) totalApprovedCompOffDays += r.compOffDays;
    });

    return NextResponse.json({
      success: true,
      records,
      pendingClaims,
      summary: {
        pendingCount: pendingClaims.length,
        approvedCount: approvedClaims.length,
        totalApprovedOtHours,
        totalApprovedCompOffDays,
      },
    });
  } catch (error: any) {
    console.error("TL overtime fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load team overtime claims" },
      { status: 500 }
    );
  }
}

// PATCH approve or reject an Overtime / Comp-Off claim
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "TL" && session.user.role !== "ADMIN" && session.user.role !== "CEO")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const reviewerId = Number(session.user.id);
    const body = await request.json();
    const { id, action, rejectionReason } = body;

    if (!id || !action || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json(
        { success: false, error: "Invalid claim ID or action specified." },
        { status: 400 }
      );
    }

    const claim = await prisma.overtimeRecord.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teamId: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { success: false, error: "Overtime claim record not found." },
        { status: 404 }
      );
    }

    if (claim.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: `Claim has already been ${claim.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const currentYear = new Date(claim.date).getFullYear();

    if (action === "APPROVE") {
      // If employee claimed Comp-Off, credit their LeaveBalance inside an atomic transaction
      if (claim.claimCompOff && claim.compOffDays > 0) {
        // Find or fallback Compensatory leave type
        let compLeaveType = await prisma.leaveType.findFirst({
          where: {
            OR: [
              { code: "COMP" },
              { name: { contains: "Compensatory" } },
              { category: "Special" },
            ],
            isActive: true,
          },
        });

        if (!compLeaveType) {
          compLeaveType = await prisma.leaveType.findFirst({
            where: { isActive: true },
          });
        }

        if (compLeaveType) {
          await prisma.$transaction(async (tx) => {
            // Update claim status
            await tx.overtimeRecord.update({
              where: { id: claim.id },
              data: {
                status: "APPROVED",
                compOffCredited: true,
              },
            });

            // Upsert Leave Balance
            const existingBalance = await tx.leaveBalance.findUnique({
              where: {
                userId_leaveTypeId_year: {
                  userId: claim.userId,
                  leaveTypeId: compLeaveType.id,
                  year: currentYear,
                },
              },
            });

            if (existingBalance) {
              await tx.leaveBalance.update({
                where: { id: existingBalance.id },
                data: {
                  total: existingBalance.total + claim.compOffDays,
                  remaining: existingBalance.remaining + claim.compOffDays,
                },
              });
            } else {
              await tx.leaveBalance.create({
                data: {
                  userId: claim.userId,
                  leaveTypeId: compLeaveType.id,
                  year: currentYear,
                  total: claim.compOffDays,
                  used: 0,
                  remaining: claim.compOffDays,
                },
              });
            }
          });
        } else {
          await prisma.overtimeRecord.update({
            where: { id: claim.id },
            data: { status: "APPROVED" },
          });
        }
      } else {
        await prisma.overtimeRecord.update({
          where: { id: claim.id },
          data: { status: "APPROVED" },
        });
      }

      // Notify Employee (In-App & Email)
      try {
        const claimLabel = claim.claimCompOff
          ? `+${claim.compOffDays} Day Comp-Off Leave Credit`
          : `${claim.hours} Hours Overtime`;

        await prisma.notification.create({
          data: {
            userId: claim.userId,
            title: "Overtime / Comp-Off Approved! 🎉",
            message: `Your supervisor approved your claim for ${new Date(claim.date).toDateString()} (${claimLabel}).`,
          },
        });

        if (claim.user.email) {
          sendOvertimeUpdateEmail({
            employeeName: claim.user.name,
            employeeEmail: claim.user.email,
            date: new Date(claim.date).toLocaleDateString(),
            hours: claim.hours,
            type: claim.type,
            status: "APPROVED",
            reviewerName: session.user.name || "Supervisor",
            recipients: [claim.user.email],
          }).catch((err) => console.warn("Async OT approve email failed:", err));
        }
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            userId: reviewerId,
            action: "APPROVE_OVERTIME_COMPOFF",
            entity: "OvertimeRecord",
            entityId: claim.id,
            details: `Approved ${claim.claimCompOff ? `Comp-Off (+${claim.compOffDays}d)` : `OT (${claim.hours}h)`} for ${claim.user.name}`.substring(0, 191),
          },
        });
      } catch (auditErr) {
        console.warn("Audit error:", auditErr);
      }

      return NextResponse.json({
        success: true,
        message: claim.claimCompOff
          ? `Approved! Credited +${claim.compOffDays} day to ${claim.user.name}'s leave balance.`
          : `Approved ${claim.hours} overtime hours for ${claim.user.name}.`,
      });
    }

    if (action === "REJECT") {
      await prisma.overtimeRecord.update({
        where: { id: claim.id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason?.trim() || "Declined by supervisor",
        },
      });

      // Notify Employee (In-App & Email)
      try {
        await prisma.notification.create({
          data: {
            userId: claim.userId,
            title: "Overtime Claim Rejected",
            message: `Your supervisor rejected your claim for ${new Date(claim.date).toDateString()}. Reason: ${rejectionReason || "Declined"}`,
          },
        });

        if (claim.user.email) {
          sendOvertimeUpdateEmail({
            employeeName: claim.user.name,
            employeeEmail: claim.user.email,
            date: new Date(claim.date).toLocaleDateString(),
            hours: claim.hours,
            type: claim.type,
            status: "REJECTED",
            reviewerName: session.user.name || "Supervisor",
            rejectionReason: rejectionReason?.trim() || "Declined by supervisor",
            recipients: [claim.user.email],
          }).catch((err) => console.warn("Async OT reject email failed:", err));
        }
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: `Claim has been rejected.`,
      });
    }

    return NextResponse.json({ success: false, error: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("TL overtime decision error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process claim decision" },
      { status: 500 }
    );
  }
}
