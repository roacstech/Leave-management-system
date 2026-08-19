import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET today's attendance logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      attendances,
    });
  } catch (error: any) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST / PATCH: Record or update attendance for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status, checkIn, checkOut, date } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { success: false, error: "User ID and status are required." },
        { status: 400 }
      );
    }

    const now = new Date();
    const targetDate = date ? new Date(date) : now;
    const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

    // Look for existing attendance record for this user and day
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: Number(userId),
        date: {
          gte: normalizedDate,
          lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999),
        },
      },
    });

    let result;
    if (existing) {
      result = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: status,
          checkIn: checkIn ? new Date(checkIn) : existing.checkIn || now,
          checkOut: checkOut ? new Date(checkOut) : existing.checkOut,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    } else {
      result = await prisma.attendance.create({
        data: {
          userId: Number(userId),
          date: normalizedDate,
          status: status,
          checkIn: checkIn ? new Date(checkIn) : (status === "ABSENT" ? null : now),
          checkOut: checkOut ? new Date(checkOut) : null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status} for ${result.user.name}.`,
      attendance: result,
    });
  } catch (error: any) {
    console.error("Record attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}
