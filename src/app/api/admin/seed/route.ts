import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Create Teams if they don't exist
    const teamNames = ["Engineering", "Product & Design", "Marketing & Growth", "Human Resources", "Customer Success"];
    const teams: { [key: string]: any } = {};

    for (const name of teamNames) {
      teams[name] = await prisma.team.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    // 2. Create Leave Types (Exact 5 types from Slide 7)
    const leaveTypeConfigs = [
      { name: "Casual Leave", code: "CL", description: "Casual and personal leave" },
      { name: "Sick Day", code: "SL", description: "Medical and health related sick leave" },
      { name: "Comp Off", code: "CO", description: "Earned compensatory off days" },
      { name: "Loss Of Pay", code: "LOP", description: "Unpaid leave of absence" },
      { name: "Vacation Leave", code: "VL", description: "Paid vacation and annual leave" },
    ];

    // Deactivate non-standard types like Maternity/Paternity
    await prisma.leaveType.updateMany({
      where: {
        code: { notIn: ["CL", "SL", "CO", "LOP", "VL"] },
      },
      data: {
        isActive: false,
      },
    });

    const leaveTypes: { [key: string]: any } = {};
    for (const lt of leaveTypeConfigs) {
      leaveTypes[lt.code] = await prisma.leaveType.upsert({
        where: { code: lt.code },
        update: { name: lt.name, description: lt.description, isActive: true },
        create: { name: lt.name, code: lt.code, description: lt.description, isActive: true },
      });
    }

    // 3. Create Sample Users (Admin, TLs, Employees)
    const mockUsers = [
      { name: "Alex Morgan", email: "alex.admin@company.com", role: "ADMIN", team: "Engineering" },
      { name: "Sarah Connor", email: "sarah.tl@company.com", role: "TL", team: "Engineering" },
      { name: "Marcus Vance", email: "marcus.tl@company.com", role: "TL", team: "Product & Design" },
      { name: "David Kim", email: "david.tl@company.com", role: "TL", team: "Marketing & Growth" },
      { name: "Elena Rostova", email: "elena.tl@company.com", role: "TL", team: "Human Resources" },
      { name: "James Wilson", email: "james.w@company.com", role: "EMPLOYEE", team: "Engineering" },
      { name: "Aaliyah Patel", email: "aaliyah.p@company.com", role: "EMPLOYEE", team: "Engineering" },
      { name: "Lucas Chen", email: "lucas.c@company.com", role: "EMPLOYEE", team: "Engineering" },
      { name: "Sophia Martinez", email: "sophia.m@company.com", role: "EMPLOYEE", team: "Product & Design" },
      { name: "Ethan Hunt", email: "ethan.h@company.com", role: "EMPLOYEE", team: "Product & Design" },
      { name: "Olivia Davis", email: "olivia.d@company.com", role: "EMPLOYEE", team: "Marketing & Growth" },
      { name: "Liam O'Connor", email: "liam.oc@company.com", role: "EMPLOYEE", team: "Marketing & Growth" },
      { name: "Emma Watson", email: "emma.w@company.com", role: "EMPLOYEE", team: "Customer Success" },
      { name: "Noah Taylor", email: "noah.t@company.com", role: "EMPLOYEE", team: "Customer Success" },
    ];

    const createdUsers: any[] = [];
    for (const u of mockUsers) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role as any,
          teamId: teams[u.team]?.id || null,
        },
        create: {
          name: u.name,
          email: u.email,
          password: "password123", // hashed placeholder
          role: u.role as any,
          teamId: teams[u.team]?.id || null,
        },
      });
      createdUsers.push(user);
    }

    // 4. Create Leave Balances for Users
    const currentYear = new Date().getFullYear();
    for (const user of createdUsers) {
      for (const lt of Object.values(leaveTypes)) {
        await prisma.leaveBalance.upsert({
          where: {
            userId_leaveTypeId_year: {
              userId: user.id,
              leaveTypeId: lt.id,
              year: currentYear,
            },
          },
          update: {},
          create: {
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
            total: lt.code === "AL" ? 18 : lt.code === "SL" ? 12 : 10,
            used: 2,
            remaining: lt.code === "AL" ? 16 : lt.code === "SL" ? 10 : 8,
          },
        });
      }
    }

    // 5. Create Sample Leave Requests (Pending, Approved, Rejected)
    const employees = createdUsers.filter((u) => u.role === "EMPLOYEE" || u.role === "TL");
    
    // Clear old sample requests if any to keep test data clean
    const existingReqs = await prisma.leaveRequest.count();
    if (existingReqs === 0) {
      const now = new Date();
      const sampleRequests = [
        {
          user: employees[0],
          type: leaveTypes["AL"],
          status: "PENDING_TL" as const,
          daysAhead: 3,
          duration: 2,
          reason: "Family gathering and cousin's wedding ceremony.",
        },
        {
          user: employees[1],
          type: leaveTypes["SL"],
          status: "PENDING_TL" as const,
          daysAhead: 1,
          duration: 1,
          reason: "Medical checkup and consultation with dentist.",
        },
        {
          user: employees[2],
          type: leaveTypes["CL"],
          status: "PENDING_TL" as const,
          daysAhead: 5,
          duration: 3,
          reason: "Personal home maintenance and relocation assistance.",
        },
        {
          user: employees[3],
          type: leaveTypes["AL"],
          status: "APPROVED" as const,
          daysAhead: 7,
          duration: 4,
          reason: "Annual vacation trip to national park.",
        },
        {
          user: employees[4],
          type: leaveTypes["SL"],
          status: "APPROVED" as const,
          daysAhead: -2,
          duration: 2,
          reason: "Recovering from seasonal viral fever.",
        },
        {
          user: employees[5],
          type: leaveTypes["COMP"],
          status: "APPROVED" as const,
          daysAhead: 2,
          duration: 1,
          reason: "Comp off for weekend system migration deployment.",
        },
        {
          user: employees[6],
          type: leaveTypes["CL"],
          status: "REJECTED" as const,
          daysAhead: 4,
          duration: 2,
          reason: "Long weekend personal trip.",
          rejectionReason: "Critical sprint deadline on requested dates; team coverage insufficient.",
        },
        {
          user: employees[7],
          type: leaveTypes["AL"],
          status: "REJECTED" as const,
          daysAhead: 10,
          duration: 5,
          reason: "Unplanned leisure travel.",
          rejectionReason: "Multiple leads already on approved leave during this release window.",
        },
      ];

      for (const req of sampleRequests) {
        if (!req.user || !req.type) continue;
        const startDate = new Date(now.getTime() + req.daysAhead * 24 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + (req.duration - 1) * 24 * 60 * 60 * 1000);
        
        await prisma.leaveRequest.create({
          data: {
            userId: req.user.id,
            leaveTypeId: req.type.id,
            startDate,
            endDate,
            status: req.status,
            reason: req.reason,
            rejectionReason: req.rejectionReason || null,
          },
        });
      }
    }

    // 6. Create Today's Attendance Logs
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const attendanceStatuses = [
      { status: "PRESENT", checkInHour: 9, checkInMin: 15 },
      { status: "PRESENT", checkInHour: 8, checkInMin: 55 },
      { status: "PRESENT", checkInHour: 9, checkInMin: 0 },
      { status: "LATE", checkInHour: 10, checkInMin: 25 },
      { status: "LATE", checkInHour: 10, checkInMin: 45 },
      { status: "HALF_DAY", checkInHour: 9, checkInMin: 30 },
      { status: "PRESENT", checkInHour: 9, checkInMin: 5 },
      { status: "ABSENT", checkInHour: 0, checkInMin: 0 },
    ];

    for (let i = 0; i < employees.length; i++) {
      const user = employees[i];
      const attConfig = attendanceStatuses[i % attendanceStatuses.length];

      const checkInTime = attConfig.status === "ABSENT" 
        ? null 
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), attConfig.checkInHour, attConfig.checkInMin);

      const existingAtt = await prisma.attendance.findFirst({
        where: {
          userId: user.id,
          date: todayMidnight,
        },
      });

      if (!existingAtt) {
        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: todayMidnight,
            status: attConfig.status,
            checkIn: checkInTime,
            checkOut: null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sample data seeded successfully into LMS database!",
    });
  } catch (error: any) {
    console.error("Seed database error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed sample data" },
      { status: 500 }
    );
  }
}
