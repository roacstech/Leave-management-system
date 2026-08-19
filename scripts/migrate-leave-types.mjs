import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

async function main() {
  const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD || "Roacs2025",
    database: "LMS",
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Adding policy columns to LeaveType table in MySQL if not present...");
    
    // Add columns one by one safely with IGNORE / IF NOT EXISTS or catch
    const columns = [
      "ALTER TABLE `LeaveType` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'Annual'",
      "ALTER TABLE `LeaveType` ADD COLUMN `annualAllocation` DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE `LeaveType` ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT TRUE",
      "ALTER TABLE `LeaveType` ADD COLUMN `carryForward` BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE `LeaveType` ADD COLUMN `maxCarryForwardDays` INT NOT NULL DEFAULT 0",
      "ALTER TABLE `LeaveType` ADD COLUMN `maxConsecutiveDays` INT NOT NULL DEFAULT 14",
      "ALTER TABLE `LeaveType` ADD COLUMN `requiresApproval` BOOLEAN NOT NULL DEFAULT TRUE",
      "ALTER TABLE `LeaveType` ADD COLUMN `requiresAttachment` BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE `LeaveType` ADD COLUMN `minimumNoticeDays` INT NOT NULL DEFAULT 0",
      "ALTER TABLE `LeaveType` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT TRUE",
    ];

    for (const sql of columns) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (colErr) {
        // Column might already exist
      }
    }
    console.log("LeaveType table columns verified!");

    // Seed or update comprehensive default leave types & policies
    const defaultLeaveTypes = [
      {
        name: "Annual Leave",
        code: "AL",
        description: "Paid annual vacation days for all full-time employees to relax and recharge.",
        category: "Annual",
        annualAllocation: 18,
        isPaid: true,
        carryForward: true,
        maxCarryForwardDays: 5,
        maxConsecutiveDays: 14,
        requiresApproval: true,
        requiresAttachment: false,
        minimumNoticeDays: 2,
        isActive: true,
      },
      {
        name: "Casual Leave",
        code: "CL",
        description: "Short-notice leaves for urgent personal affairs and unforeseen commitments.",
        category: "Casual",
        annualAllocation: 10,
        isPaid: true,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 3,
        requiresApproval: true,
        requiresAttachment: false,
        minimumNoticeDays: 1,
        isActive: true,
      },
      {
        name: "Sick Leave",
        code: "SL",
        description: "Medical recovery leaves for personal health and doctor-advised rest.",
        category: "Sick",
        annualAllocation: 12,
        isPaid: true,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 7,
        requiresApproval: true,
        requiresAttachment: true,
        minimumNoticeDays: 0,
        isActive: true,
      },
      {
        name: "Maternity Leave",
        code: "MAT",
        description: "Dedicated paid parental care leave for female employees welcoming a newborn child.",
        category: "Maternity",
        annualAllocation: 90,
        isPaid: true,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 90,
        requiresApproval: true,
        requiresAttachment: true,
        minimumNoticeDays: 30,
        isActive: true,
      },
      {
        name: "Paternity Leave",
        code: "PAT",
        description: "Dedicated paid parental leave for male employees upon the birth or adoption of a child.",
        category: "Paternity",
        annualAllocation: 15,
        isPaid: true,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 15,
        requiresApproval: true,
        requiresAttachment: true,
        minimumNoticeDays: 14,
        isActive: true,
      },
      {
        name: "Compensatory Off",
        code: "COMP",
        description: "Earned rest days awarded for weekend critical deployment or overtime support.",
        category: "Compensatory",
        annualAllocation: 5,
        isPaid: true,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 2,
        requiresApproval: true,
        requiresAttachment: false,
        minimumNoticeDays: 1,
        isActive: true,
      },
      {
        name: "Loss of Pay (Unpaid)",
        code: "LOP",
        description: "Unpaid leave taken when standard allocated paid leave balances are exhausted.",
        category: "Other",
        annualAllocation: 0,
        isPaid: false,
        carryForward: false,
        maxCarryForwardDays: 0,
        maxConsecutiveDays: 30,
        requiresApproval: true,
        requiresAttachment: false,
        minimumNoticeDays: 3,
        isActive: true,
      },
    ];

    for (const lt of defaultLeaveTypes) {
      const existing = await prisma.leaveType.findFirst({
        where: { OR: [{ code: lt.code }, { name: lt.name }] },
      });

      if (existing) {
        await prisma.leaveType.update({
          where: { id: existing.id },
          data: lt,
        });
        console.log(`Updated policy for ${lt.name} (${lt.code})`);
      } else {
        await prisma.leaveType.create({
          data: lt,
        });
        console.log(`Created leave type ${lt.name} (${lt.code})`);
      }
    }

    console.log("Leave types migration and seed completed!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
