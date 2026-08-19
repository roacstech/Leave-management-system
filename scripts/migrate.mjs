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
    console.log("Adding column isActive to User table if not exists...");
    await prisma.$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT TRUE");
    console.log("Successfully added isActive column to User table!");
  } catch (err) {
    console.log("Notice from MySQL (column might already exist):", err.message);
  }

  // Verify users
  try {
    const users = await prisma.user.findMany({ take: 5 });
    console.log("Sample users with isActive:", users);
  } catch (err) {
    console.error("Error reading users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
