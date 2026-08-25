import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Seeding realistic historical leave requests for past months...");

  const users = await prisma.user.findMany({
    where: { role: { in: ["EMPLOYEE", "TL"] } },
  });

  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  if (users.length === 0 || leaveTypes.length === 0) {
    console.log("No users or leave types found.");
    return;
  }

  const history = [
    // March 2026 (4 leaves)
    { month: 2, dayStart: 3, dayEnd: 5, status: "APPROVED", reason: "Family function travel", userIdx: 0, ltIdx: 0 },
    { month: 2, dayStart: 12, dayEnd: 13, status: "APPROVED", reason: "Seasonal viral fever", userIdx: 1, ltIdx: 1 },
    { month: 2, dayStart: 19, dayEnd: 20, status: "APPROVED", reason: "Personal urgent errands", userIdx: 2, ltIdx: 0 },
    { month: 2, dayStart: 25, dayEnd: 26, status: "APPROVED", reason: "Health wellness checkup", userIdx: 3, ltIdx: 1 },

    // April 2026 (6 approved, 1 rejected)
    { month: 3, dayStart: 2, dayEnd: 3, status: "APPROVED", reason: "Spring vacation time off", userIdx: 0, ltIdx: 0 },
    { month: 3, dayStart: 8, dayEnd: 9, status: "APPROVED", reason: "Severe headache and fever", userIdx: 1, ltIdx: 1 },
    { month: 3, dayStart: 14, dayEnd: 15, status: "APPROVED", reason: "Home maintenance work", userIdx: 2, ltIdx: 0 },
    { month: 3, dayStart: 18, dayEnd: 18, status: "REJECTED", reason: "Unnotified absence", userIdx: 3, ltIdx: 2 },
    { month: 3, dayStart: 22, dayEnd: 23, status: "APPROVED", reason: "Family event", userIdx: 4, ltIdx: 0 },
    { month: 3, dayStart: 28, dayEnd: 29, status: "APPROVED", reason: "Dental surgery", userIdx: 0, ltIdx: 1 },
    { month: 3, dayStart: 29, dayEnd: 30, status: "APPROVED", reason: "Short travel trip", userIdx: 1, ltIdx: 0 },

    // May 2026 (5 approved)
    { month: 4, dayStart: 4, dayEnd: 5, status: "APPROVED", reason: "Annual family getaway", userIdx: 2, ltIdx: 0 },
    { month: 4, dayStart: 11, dayEnd: 12, status: "APPROVED", reason: "Food poisoning recovery", userIdx: 3, ltIdx: 1 },
    { month: 4, dayStart: 18, dayEnd: 19, status: "APPROVED", reason: "Outstation wedding ceremony", userIdx: 4, ltIdx: 0 },
    { month: 4, dayStart: 22, dayEnd: 23, status: "APPROVED", reason: "Personal emergency", userIdx: 0, ltIdx: 0 },
    { month: 4, dayStart: 27, dayEnd: 28, status: "APPROVED", reason: "Migraine rest day", userIdx: 1, ltIdx: 1 },

    // June 2026 (8 approved, 1 cancelled)
    { month: 5, dayStart: 2, dayEnd: 4, status: "APPROVED", reason: "Summer vacation with family", userIdx: 0, ltIdx: 0 },
    { month: 5, dayStart: 8, dayEnd: 9, status: "APPROVED", reason: "Eye doctor consultation", userIdx: 1, ltIdx: 1 },
    { month: 5, dayStart: 12, dayEnd: 13, status: "APPROVED", reason: "Sister's graduation", userIdx: 2, ltIdx: 0 },
    { month: 5, dayStart: 16, dayEnd: 17, status: "CANCELLED", reason: "Plans called off", userIdx: 3, ltIdx: 0 },
    { month: 5, dayStart: 18, dayEnd: 19, status: "APPROVED", reason: "High fever bed rest", userIdx: 4, ltIdx: 1 },
    { month: 5, dayStart: 22, dayEnd: 23, status: "APPROVED", reason: "Apartment moving day", userIdx: 0, ltIdx: 0 },
    { month: 5, dayStart: 25, dayEnd: 26, status: "APPROVED", reason: "Routine wellness", userIdx: 1, ltIdx: 1 },
    { month: 5, dayStart: 29, dayEnd: 30, status: "APPROVED", reason: "Extended weekend trip", userIdx: 2, ltIdx: 0 },
    { month: 5, dayStart: 30, dayEnd: 30, status: "APPROVED", reason: "Medical test", userIdx: 3, ltIdx: 1 },

    // July 2026 (10 approved, 1 rejected)
    { month: 6, dayStart: 2, dayEnd: 3, status: "APPROVED", reason: "Mid-year break", userIdx: 0, ltIdx: 0 },
    { month: 6, dayStart: 6, dayEnd: 7, status: "APPROVED", reason: "Flu recovery", userIdx: 1, ltIdx: 1 },
    { month: 6, dayStart: 9, dayEnd: 10, status: "APPROVED", reason: "Attending technical conference", userIdx: 2, ltIdx: 0 },
    { month: 6, dayStart: 13, dayEnd: 14, status: "APPROVED", reason: "Family hospital visit", userIdx: 3, ltIdx: 1 },
    { month: 6, dayStart: 16, dayEnd: 17, status: "REJECTED", reason: "Insufficient notice period", userIdx: 4, ltIdx: 0 },
    { month: 6, dayStart: 20, dayEnd: 21, status: "APPROVED", reason: "Personal commitments", userIdx: 0, ltIdx: 0 },
    { month: 6, dayStart: 23, dayEnd: 24, status: "APPROVED", reason: "Dental appointment", userIdx: 1, ltIdx: 1 },
    { month: 6, dayStart: 27, dayEnd: 28, status: "APPROVED", reason: "Rainstorm travel difficulty", userIdx: 2, ltIdx: 2 },
    { month: 6, dayStart: 28, dayEnd: 29, status: "APPROVED", reason: "Severe back sprain", userIdx: 3, ltIdx: 1 },
    { month: 6, dayStart: 30, dayEnd: 31, status: "APPROVED", reason: "Family reunion", userIdx: 4, ltIdx: 0 },
    { month: 6, dayStart: 31, dayEnd: 31, status: "APPROVED", reason: "Emergency doctor visit", userIdx: 0, ltIdx: 1 },
  ];

  for (const item of history) {
    const user = users[item.userIdx % users.length];
    const leaveType = leaveTypes[item.ltIdx % leaveTypes.length];
    const startDate = new Date(2026, item.month, item.dayStart, 9, 0, 0);
    const endDate = new Date(2026, item.month, item.dayEnd, 18, 0, 0);

    await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        reason: item.reason,
        status: item.status as any,
        createdAt: startDate,
        approvedAt: item.status === "APPROVED" ? startDate : null,
        rejectedAt: item.status === "REJECTED" ? startDate : null,
      },
    });
  }

  // Seed Public Holidays
  console.log("Seeding official public holidays...");
  const holidays = [
    { name: "Independence Day", date: new Date(2026, 7, 15) },
    { name: "Ganesh Chaturthi", date: new Date(2026, 8, 14) },
    { name: "Gandhi Jayanti", date: new Date(2026, 9, 2) },
    { name: "Dussehra (Vijayadashami)", date: new Date(2026, 9, 20) },
    { name: "Diwali (Deepavali)", date: new Date(2026, 10, 8) },
    { name: "Christmas Day", date: new Date(2026, 11, 25) },
    { name: "New Year's Day", date: new Date(2027, 0, 1) },
    { name: "Republic Day", date: new Date(2027, 0, 26) },
  ];

  for (const h of holidays) {
    const existing = await prisma.holiday.findFirst({ where: { name: h.name, date: h.date } });
    if (!existing) {
      await prisma.holiday.create({ data: { name: h.name, date: h.date } });
    }
  }

  // Seed TL / Manager leaves for August & September
  const tlUser = await prisma.user.findFirst({ where: { role: "TL" } });
  if (tlUser && leaveTypes.length > 0) {
    const tlLeaves = [
      { start: new Date(2026, 7, 28, 9, 0), end: new Date(2026, 7, 29, 18, 0), reason: "Leadership summit & travel", lt: leaveTypes[0] },
      { start: new Date(2026, 8, 4, 9, 0), end: new Date(2026, 8, 5, 18, 0), reason: "Personal annual leave", lt: leaveTypes[0] },
    ];
    for (const l of tlLeaves) {
      await prisma.leaveRequest.create({
        data: {
          userId: tlUser.id,
          leaveTypeId: l.lt.id,
          startDate: l.start,
          endDate: l.end,
          reason: l.reason,
          status: "APPROVED",
          createdAt: l.start,
          approvedAt: l.start,
        },
      });
    }
  }

  console.log(`Successfully seeded historical records, official public holidays, and leadership leaves!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
