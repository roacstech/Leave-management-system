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

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Fetch all Team Leads and all Teams
    const [teamLeads, allTeams] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: "TL",
        },
        include: {
          team: true,
          reportees: {
            where: { isActive: true },
            include: {
              attendance: {
                where: { date: { gte: startOfToday, lte: endOfToday } },
                take: 1,
              },
              leaveRequests: {
                where: {
                  status: "APPROVED",
                  startDate: { lte: endOfToday },
                  endDate: { gte: startOfToday },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),

      prisma.team.findMany({
        include: {
          users: { where: { isActive: true }, select: { id: true } },
        },
      }),
    ]);

    // Format metrics for each Team Lead
    const formattedTLs = await Promise.all(
      teamLeads.map(async (tl) => {
        const members = tl.reportees;
        const memberIds = members.map((m) => m.id);

        // Fetch pending leaves submitted by their team
        const pendingCount = memberIds.length > 0
          ? await prisma.leaveRequest.count({
              where: {
                userId: { in: memberIds },
                status: "PENDING_TL",
              },
            })
          : 0;

        // Today's attendance for the team
        const presentCount = members.filter((m) => {
          const att = m.attendance[0];
          return att && (att.status === "PRESENT" || att.status === "ON_TIME" || att.status === "LATE");
        }).length;

        const attendanceRate = members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0;

        return {
          id: tl.id,
          name: tl.name,
          email: tl.email,
          role: tl.role,
          teamId: tl.team?.id || null,
          teamName: tl.team?.name || "Functional Unit",
          teamSize: members.length,
          pendingLeavesCount: pendingCount,
          attendanceRate,
          members: members.map((m) => {
            const att = m.attendance[0];
            const leave = m.leaveRequests[0];
            let status = "NOT_MARKED";
            if (leave) status = "ON_LEAVE";
            else if (att) status = att.status;

            return {
              id: m.id,
              name: m.name,
              email: m.email,
              role: m.role,
              status,
            };
          }),
        };
      })
    );

    return NextResponse.json({
      success: true,
      teamLeads: formattedTLs,
      totalTeamsCount: allTeams.length,
      totalTLsCount: formattedTLs.length,
    });
  } catch (error: any) {
    console.error("CEO Team Leads API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch team leads" },
      { status: 500 }
    );
  }
}
