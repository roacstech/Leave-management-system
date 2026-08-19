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
    // 1. Create test employee
    const testEmp = await prisma.user.create({
      data: {
        name: "Test User",
        email: "test.user@company.com",
        password: "password123",
        role: "EMPLOYEE",
        isActive: true,
      },
    });
    console.log("Created test user:", testEmp);

    // 2. Update status to inactive
    const updated = await prisma.user.update({
      where: { id: testEmp.id },
      data: { isActive: false, role: "TL" },
    });
    console.log("Updated test user:", updated);

    // 3. Delete test employee
    await prisma.user.delete({ where: { id: testEmp.id } });
    console.log("Deleted test user successfully!");
  } catch (err) {
    console.error("CRUD test error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
