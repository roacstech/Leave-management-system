import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET monthly attendance logs, shift summary, and today's status for employee
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
    const statusFilter = searchParams.get("status") || "ALL";

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [settings, attendanceRecords, approvedLeaves, holidays, todayRecord] = await Promise.all([
      getSystemSettings(),
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
      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: "APPROVED",
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        include: {
          leaveType: {
            select: { name: true, code: true },
          },
        },
      }),
      prisma.holiday.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.attendance.findFirst({
        where: {
          userId,
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
    ]);

    // Build day-by-day logs for the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const logs = [];

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let totalWorkHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month - 1, d);
      const isFuture = curDate > now && curDate.toDateString() !== now.toDateString();

      // Find attendance for this day
      const record = attendanceRecords.find(
        (a) => new Date(a.date).toDateString() === curDate.toDateString()
      );

      // Find holiday for this day
      const holiday = holidays.find(
        (h) => new Date(h.date).toDateString() === curDate.toDateString()
      );

      // Find approved leave for this day
      const leave = approvedLeaves.find((l) => {
        const s = new Date(l.startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(l.endDate);
        e.setHours(23, 59, 59, 999);
        return curDate >= s && curDate <= e;
      });

      let workHours = null;
      if (record?.checkIn && record?.checkOut) {
        const diff = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
        if (diff > 0) {
          workHours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
          totalWorkHours += workHours;
        }
      }

      let displayStatus = "ABSENT";
      if (holiday) {
        displayStatus = "HOLIDAY";
      } else if (leave) {
        displayStatus = "ON_LEAVE";
        leaveCount++;
      } else if (record) {
        displayStatus = record.status;
        if (record.status === "PRESENT") presentCount++;
        else if (record.status === "LATE") lateCount++;
        else if (record.status === "HALF_DAY") halfDayCount++;
      } else if (curDate.getDay() === 0 || curDate.getDay() === 6) {
        displayStatus = "WEEKEND";
      } else if (isFuture) {
        displayStatus = "SCHEDULED";
      }

      logs.push({
        day: d,
        date: curDate.toISOString(),
        dayOfWeek: curDate.getDay(),
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        workHours,
        status: displayStatus,
        holidayName: holiday?.name || null,
        leaveDetails: leave
          ? `${leave.leaveType.name} (${leave.leaveType.code})`
          : null,
        isFuture,
      });
    }

    // Filter logs if requested
    const filteredLogs = logs.filter((log) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PRESENT") return log.status === "PRESENT";
      if (statusFilter === "LATE") return log.status === "LATE";
      if (statusFilter === "HALF_DAY") return log.status === "HALF_DAY";
      if (statusFilter === "ON_LEAVE") return log.status === "ON_LEAVE";
      if (statusFilter === "ABSENT") return log.status === "ABSENT";
      return true;
    });

    const workedDaysCount = presentCount + lateCount + halfDayCount;
    const avgHoursPerDay =
      workedDaysCount > 0 ? Math.round((totalWorkHours / workedDaysCount) * 10) / 10 : 0;

    let todayWorkHours = null;
    if (todayRecord?.checkIn && todayRecord?.checkOut) {
      const diff = new Date(todayRecord.checkOut).getTime() - new Date(todayRecord.checkIn).getTime();
      if (diff > 0) todayWorkHours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
    }

    return NextResponse.json({
      success: true,
      month,
      year,
      summary: {
        presentCount,
        lateCount,
        halfDayCount,
        leaveCount,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        avgHoursPerDay,
        workedDaysCount,
      },
      todayStatus: todayRecord
        ? {
            id: todayRecord.id,
            checkIn: todayRecord.checkIn,
            checkOut: todayRecord.checkOut,
            status: todayRecord.status,
            workHours: todayWorkHours,
          }
        : null,
      logs: filteredLogs.reverse(), // Most recent days first
      settings: {
        officeStartTime: settings.officeStartTime || "09:00 AM",
        officeEndTime: settings.officeEndTime || "06:00 PM",
        gracePeriodMinutes: settings.gracePeriodMinutes || 10,
      },
    });
  } catch (error: any) {
    console.error("Fetch employee attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load attendance records" },
      { status: 500 }
    );
  }
}

// POST handle Employee self check-in / check-out punch
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
    const { action } = body; // "CHECK_IN" | "CHECK_OUT"

    if (!action || (action !== "CHECK_IN" && action !== "CHECK_OUT")) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Specify CHECK_IN or CHECK_OUT." },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const settings = await getSystemSettings();

    // Check existing attendance for today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (action === "CHECK_IN") {
      if (existing?.checkIn) {
        return NextResponse.json(
          { success: false, error: "You have already checked in for today." },
          { status: 400 }
        );
      }

      // Determine if check-in is late (officeStartTime + gracePeriodMinutes)
      let status = "PRESENT";
      try {
        const [timePart, meridiem] = (settings.officeStartTime || "09:00 AM").split(" ");
        let [startHour, startMin] = timePart.split(":").map(Number);
        if (meridiem === "PM" && startHour < 12) startHour += 12;
        if (meridiem === "AM" && startHour === 12) startHour = 0;

        const lateThreshold = new Date(now);
        lateThreshold.setHours(startHour, startMin + (settings.gracePeriodMinutes || 10), 0, 0);

        if (now > lateThreshold) {
          status = "LATE";
        }
      } catch (err) {
        console.warn("Could not calculate late threshold:", err);
      }

      let attendanceRecord;
      if (existing) {
        attendanceRecord = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn: now,
            status,
          },
        });
      } else {
        attendanceRecord = await prisma.attendance.create({
          data: {
            userId,
            date: startOfToday,
            checkIn: now,
            status,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: status === "LATE" ? "Checked in (Marked Late)" : "Checked in successfully!",
        attendance: attendanceRecord,
      });
    }

    if (action === "CHECK_OUT") {
      if (!existing?.checkIn) {
        return NextResponse.json(
          { success: false, error: "Please check in first before checking out." },
          { status: 400 }
        );
      }

      const attendanceRecord = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Checked out successfully!",
        attendance: attendanceRecord,
      });
    }

    return NextResponse.json({ success: false, error: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("Employee self attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process attendance punch" },
      { status: 500 }
    );
  }
}
