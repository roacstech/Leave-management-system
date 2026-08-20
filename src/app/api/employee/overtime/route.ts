import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings, canSendNotification } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET employee overtime records and eligible punch dates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || `${now.getMonth() + 1}`, 10);
    const year = parseInt(searchParams.get("year") || `${now.getFullYear()}`, 10);

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [records, attendanceList, holidays] = await Promise.all([
      prisma.overtimeRecord.findMany({
        where: {
          userId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: {
          date: "desc",
        },
      }),
      prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: {
          date: "desc",
        },
      }),
      prisma.holiday.findMany({
        where: {
          fromDate: { lte: endOfMonth },
          toDate: { gte: startOfMonth },
        },
      }),
    ]);

    // Find attendance records that have worked hours and check eligibility
    const claimedDates = new Set(
      records.map((r) => new Date(r.date).toDateString())
    );

    const eligiblePunches: any[] = [];
    attendanceList.forEach((att) => {
      if (!att.checkIn || !att.checkOut) return;
      const attDate = new Date(att.date);
      if (claimedDates.has(attDate.toDateString())) return;

      const diffMs = new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime();
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      if (hours <= 0) return;

      const isWeekend = attDate.getDay() === 0 || attDate.getDay() === 6;
      const isHoliday = holidays.some((h) => {
        if (h.fromDate && h.toDate) {
          const s = new Date(h.fromDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(h.toDate);
          e.setHours(23, 59, 59, 999);
          return attDate >= s && attDate <= e;
        }
        return false;
      });

      let eligible = false;
      let calculatedCompOff = 0;
      let calculatedExtraOt = 0;
      let type = "WEEKDAY_OT";

      if (isHoliday) {
        type = "HOLIDAY_OT";
        if (hours >= 4.0) {
          eligible = true;
          if (hours >= 8.0) {
            calculatedCompOff = 1.0;
            calculatedExtraOt = Math.round((hours - 8.0) * 10) / 10;
          } else {
            calculatedCompOff = 0.5;
            calculatedExtraOt = 0;
          }
        }
      } else if (isWeekend) {
        type = "WEEKEND_OT";
        if (hours >= 4.0) {
          eligible = true;
          if (hours >= 8.0) {
            calculatedCompOff = 1.0;
            calculatedExtraOt = Math.round((hours - 8.0) * 10) / 10;
          } else {
            calculatedCompOff = 0.5;
            calculatedExtraOt = 0;
          }
        }
      } else {
        // Weekday: OT if worked > 8.0 hours
        if (hours > 8.0) {
          eligible = true;
          calculatedExtraOt = Math.round((hours - 8.0) * 10) / 10;
        }
      }

      if (eligible) {
        eligiblePunches.push({
          date: att.date,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          hours,
          type,
          isWeekend,
          isHoliday,
          compOffDays: calculatedCompOff,
          extraOtHours: calculatedExtraOt,
        });
      }
    });

    // Summary calculations
    let totalApprovedOtHours = 0;
    let totalCreditedCompOffDays = 0;
    let pendingCount = 0;

    records.forEach((r) => {
      if (r.status === "APPROVED") {
        totalApprovedOtHours += r.hours;
        if (r.claimCompOff) {
          totalCreditedCompOffDays += r.compOffDays;
        }
      } else if (r.status === "PENDING") {
        pendingCount++;
      }
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      overtimeRecords: records,
      eligiblePunches,
      summary: {
        totalApprovedOtHours,
        totalCreditedCompOffDays,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error("Employee overtime fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load overtime records" },
      { status: 500 }
    );
  }
}

// POST submit an Overtime or Comp-Off Claim
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
    const { date, hours, claimCompOff, reason } = body;

    if (!date || !hours || Number(hours) <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid date and worked hours are required." },
        { status: 400 }
      );
    }

    const claimDate = new Date(date);
    const workedHours = Number(hours);

    // Verify existing claim for same date
    const startOfClaimDate = new Date(claimDate.getFullYear(), claimDate.getMonth(), claimDate.getDate(), 0, 0, 0, 0);
    const endOfClaimDate = new Date(claimDate.getFullYear(), claimDate.getMonth(), claimDate.getDate(), 23, 59, 59, 999);

    const existingClaim = await prisma.overtimeRecord.findFirst({
      where: {
        userId,
        date: {
          gte: startOfClaimDate,
          lte: endOfClaimDate,
        },
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { success: false, error: "An overtime or comp-off claim already exists for this date." },
        { status: 400 }
      );
    }

    // Determine Day Type (Weekend, Holiday, Weekday)
    const isWeekend = claimDate.getDay() === 0 || claimDate.getDay() === 6;
    const holiday = await prisma.holiday.findFirst({
      where: {
        fromDate: { lte: endOfClaimDate },
        toDate: { gte: startOfClaimDate },
      },
    });

    let type = "WEEKDAY_OT";
    let compOffDays = 0;
    let extraOtHours = 0;

    if (holiday) {
      type = "HOLIDAY_OT";
      // 4-Hour Minimum Rule for Holiday
      if (workedHours < 4.0) {
        return NextResponse.json(
          { success: false, error: "Minimum 4.0 hours of work is required on a holiday to claim Overtime or Comp-Off." },
          { status: 400 }
        );
      }

      if (claimCompOff) {
        if (workedHours >= 8.0) {
          compOffDays = 1.0;
          extraOtHours = Math.round((workedHours - 8.0) * 10) / 10;
        } else {
          compOffDays = 0.5;
          extraOtHours = 0;
        }
      } else {
        extraOtHours = workedHours;
      }
    } else if (isWeekend) {
      type = "WEEKEND_OT";
      // 4-Hour Minimum Rule for Weekend
      if (workedHours < 4.0) {
        return NextResponse.json(
          { success: false, error: "Minimum 4.0 hours of work is required on a weekend to claim Overtime or Comp-Off." },
          { status: 400 }
        );
      }

      if (claimCompOff) {
        if (workedHours >= 8.0) {
          compOffDays = 1.0;
          extraOtHours = Math.round((workedHours - 8.0) * 10) / 10;
        } else {
          compOffDays = 0.5;
          extraOtHours = 0;
        }
      } else {
        extraOtHours = workedHours;
      }
    } else {
      // Weekday
      type = "WEEKDAY_OT";
      extraOtHours = workedHours;
    }

    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, teamId: true },
    });

    const newRecord = await prisma.overtimeRecord.create({
      data: {
        userId,
        date: startOfClaimDate,
        hours: workedHours,
        type,
        reason: reason?.trim() || null,
        status: "PENDING",
        claimCompOff: Boolean(claimCompOff),
        compOffDays,
        extraOtHours,
      },
    });

    // Notify Team Leader
    try {
      const settings = await getSystemSettings();
      if (canSendNotification("NEW_LEAVE_REQUEST", "IN_APP", settings)) {
        const approvers = await prisma.user.findMany({
          where: {
            OR: [
              { role: "ADMIN", isActive: true },
              ...(employee?.teamId
                ? [{ teamId: employee.teamId, role: "TL" as const, isActive: true }]
                : []),
            ],
          },
          select: { id: true },
        });

        const claimLabel = claimCompOff
          ? `Comp-Off Claim (+${compOffDays} Day${extraOtHours > 0 ? ` + ${extraOtHours}h OT` : ""})`
          : `Overtime Claim (${workedHours} hrs)`;

        for (const approver of approvers) {
          await prisma.notification.create({
            data: {
              userId: approver.id,
              title: "New Overtime / Comp-Off Claim",
              message: `${employee?.name || "Employee"} submitted a ${claimLabel} for ${claimDate.toDateString()}.`,
            },
          });
        }
      }
    } catch (notifErr) {
      console.warn("Notification error:", notifErr);
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CLAIM_OVERTIME_COMPOFF",
          entity: "OvertimeRecord",
          entityId: newRecord.id,
          details: `Submitted ${claimCompOff ? `Comp-Off (+${compOffDays}d)` : `OT (${workedHours}h)`} on ${claimDate.toDateString()}`.substring(0, 191),
        },
      });
    } catch (auditErr) {
      console.warn("Audit error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: claimCompOff
        ? `Comp-Off claim (+${compOffDays} Day${extraOtHours > 0 ? ` + ${extraOtHours}h OT` : ""}) submitted for TL review.`
        : "Overtime claim submitted for TL review.",
      overtimeRecord: newRecord,
    });
  } catch (error: any) {
    console.error("Submit overtime error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit overtime claim" },
      { status: 500 }
    );
  }
}
