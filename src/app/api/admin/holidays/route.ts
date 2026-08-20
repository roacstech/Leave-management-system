import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

let hasCheckedHolidayCols = false;
async function ensureHolidayTable() {
  if (hasCheckedHolidayCols) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Holiday\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(191) NOT NULL,
        \`fromDate\` DATETIME(3) NOT NULL,
        \`toDate\` DATETIME(3) NOT NULL,
        \`description\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
  } catch (err) {
    // Ignore if table already exists
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Holiday\` ADD COLUMN \`fromDate\` DATETIME(3) NULL;
    `);
  } catch (err) {}

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Holiday\` ADD COLUMN \`toDate\` DATETIME(3) NULL;
    `);
  } catch (err) {}

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Holiday\` MODIFY COLUMN \`date\` DATETIME NULL;
    `);
  } catch (err) {}

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE \`Holiday\` SET \`fromDate\` = \`date\`, \`toDate\` = \`date\` WHERE \`fromDate\` IS NULL AND \`date\` IS NOT NULL;
    `);
  } catch (err) {}

  hasCheckedHolidayCols = true;
}

// GET all holidays
export async function GET(request: NextRequest) {
  try {
    await ensureHolidayTable();

    const holidays = await prisma.holiday.findMany({
      orderBy: {
        fromDate: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      holidays,
    });
  } catch (error: any) {
    console.error("Fetch holidays error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

// POST create a new holiday
export async function POST(request: NextRequest) {
  try {
    await ensureHolidayTable();

    const body = await request.json();
    const { name, fromDate, toDate, description } = body;

    if (!name || !fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "Name, fromDate, and toDate are required." },
        { status: 400 }
      );
    }

    // Ensure dates are valid
    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json(
        { success: false, error: "End date cannot be before start date." },
        { status: 400 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday created successfully.",
      holiday,
    });
  } catch (error: any) {
    console.error("Create holiday error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create holiday" },
      { status: 500 }
    );
  }
}
