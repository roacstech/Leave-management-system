import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

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
