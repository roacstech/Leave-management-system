import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { date: { gte: startOfYear, lte: endOfYear } },
          { fromDate: { lte: endOfYear }, toDate: { gte: startOfYear } },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formattedHolidays = holidays.map((h) => {
      const holidayDate = h.date || h.fromDate || new Date();
      const from = h.fromDate || h.date || new Date();
      const to = h.toDate || h.date || new Date();

      const diffMs = new Date(to).getTime() - new Date(from).getTime();
      const durationDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

      const d = new Date(from);
      const month = d.getMonth() + 1;
      let quarter = "Q1";
      if (month >= 4 && month <= 6) quarter = "Q2";
      else if (month >= 7 && month <= 9) quarter = "Q3";
      else if (month >= 10 && month <= 12) quarter = "Q4";

      return {
        id: h.id,
        name: h.name,
        date: holidayDate.toISOString(),
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        durationDays,
        quarter,
        description: h.description,
      };
    });

    // Quarterly counts
    const q1Count = formattedHolidays.filter((h) => h.quarter === "Q1").length;
    const q2Count = formattedHolidays.filter((h) => h.quarter === "Q2").length;
    const q3Count = formattedHolidays.filter((h) => h.quarter === "Q3").length;
    const q4Count = formattedHolidays.filter((h) => h.quarter === "Q4").length;
    const totalHolidayDays = formattedHolidays.reduce((acc, curr) => acc + curr.durationDays, 0);

    return NextResponse.json({
      success: true,
      currentYear,
      holidays: formattedHolidays,
      summary: {
        totalHolidays: formattedHolidays.length,
        totalHolidayDays,
        q1Count,
        q2Count,
        q3Count,
        q4Count,
      },
    });
  } catch (error: any) {
    console.error("CEO Holidays API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load holiday calendar" },
      { status: 500 }
    );
  }
}
