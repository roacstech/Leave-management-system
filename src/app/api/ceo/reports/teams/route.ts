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

    const [teams, allOvertime, teamLeads] = await Promise.all([
      prisma.team.findMany({
        include: {
          users: {
            where: { isActive: true },
            include: {
              attendance: {
                where: { date: { gte: startOfYear, lte: endOfYear } },
              },
              leaveRequests: {
                where: {
                  status: "APPROVED",
                  startDate: { gte: startOfYear, lte: endOfYear },
                },
              },
            },
          },
        },
      }),

      prisma.overtimeRecord.findMany({
        where: {
          status: "APPROVED",
          date: { gte: startOfYear, lte: endOfYear },
        },
        include: {
          user: { select: { teamId: true } },
        },
      }),

      prisma.user.findMany({
        where: { role: "TL", isActive: true },
        select: { id: true, name: true, email: true, teamId: true },
      }),
    ]);

    const teamComparisons = teams.map((team) => {
      const members = team.users;
      const memberCount = members.length;
      const tl = teamLeads.find((lead) => lead.teamId === team.id);

      // 1. Total Leave Days Taken
      let totalLeaveDays = 0;
      members.forEach((m) => {
        m.leaveRequests.forEach((l) => {
          const diffMs = new Date(l.endDate).getTime() - new Date(l.startDate).getTime();
          const duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
          totalLeaveDays += duration;
        });
      });

      // 2. Attendance & Late Counts
      let totalAttendanceLogs = 0;
      let totalPresents = 0;
      let totalLates = 0;
      let totalAbsents = 0;

      members.forEach((m) => {
        m.attendance.forEach((a) => {
          totalAttendanceLogs++;
          if (a.status === "PRESENT" || a.status === "ON_TIME") totalPresents++;
          else if (a.status === "LATE") totalLates++;
          else if (a.status === "ABSENT") totalAbsents++;
        });
      });

      const attendanceRate = totalAttendanceLogs > 0
        ? Math.round(((totalPresents + totalLates) / totalAttendanceLogs) * 100)
        : 95;

      const lateRate = totalAttendanceLogs > 0
        ? Math.round((totalLates / totalAttendanceLogs) * 100)
        : 0;

      const avgLeavePerMember = memberCount > 0
        ? Math.round((totalLeaveDays / memberCount) * 10) / 10
        : 0;

      // 3. Overtime stats for this team
      const teamOtRecords = allOvertime.filter((ot) => ot.user.teamId === team.id);
      const totalOtHours = teamOtRecords.reduce((acc, curr) => acc + (curr.hours || 0), 0);
      const totalCompOffDays = teamOtRecords.reduce((acc, curr) => acc + (curr.compOffDays || 0), 0);

      return {
        id: team.id,
        name: team.name,
        teamLead: tl ? tl.name : "Unassigned",
        leadEmail: tl ? tl.email : "",
        headcount: memberCount,
        totalLeaveDays,
        avgLeavePerMember,
        attendanceRate,
        lateRate,
        totalOtHours,
        totalCompOffDays,
      };
    });

    return NextResponse.json({
      success: true,
      currentYear,
      teamComparisons,
    });
  } catch (error: any) {
    console.error("CEO Team Analytics API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load team comparison report" },
      { status: 500 }
    );
  }
}
