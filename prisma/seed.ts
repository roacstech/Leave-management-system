import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "leave_management",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: {
      email: "admin@lms.com",
    },
    update: {
      password: "admin123",
      role: "ADMIN",
    },
    create: {
      name: "LMS Admin",
      email: "admin@lms.com",
      password: "admin123",
      role: "ADMIN",
      updatedAt: new Date(),
    },
  });

  const employee = await prisma.user.upsert({
    where: {
      email: "employee@lms.com",
    },
    update: {
      password: "employee123",
      role: "EMPLOYEE",
    },
    create: {
      name: "Test Employee",
      email: "employee@lms.com",
      password: "employee123",
      role: "EMPLOYEE",
      updatedAt: new Date(),
    },
  });

  console.log("Employee user created:", employee.email);
  console.log("Admin user created:", admin.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });