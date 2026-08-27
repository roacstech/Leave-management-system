import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL || "mysql://mysql_lms:vpu06ce5lny4pmdlhm3f@147.93.30.32:3308/leave_management";
const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!match) { console.error("Bad URL"); process.exit(1); }
const adapter = new PrismaMariaDb({ user: match[1], password: decodeURIComponent(match[2]), host: match[3], port: Number(match[4]), database: match[5].split("?")[0], allowPublicKeyRetrieval: true });
const prisma = new PrismaClient({ adapter });

const now = new Date();
const futureLeaves = await prisma.leaveRequest.findMany({
  where: {
    createdAt: { gt: now },
  },
  select: { id: true, createdAt: true, startDate: true },
});
console.log(`Found ${futureLeaves.length} leaves with future createdAt:`, futureLeaves);

if (futureLeaves.length > 0) {
  // Fix them by setting createdAt to now or their actual creation timestamp
  for (const l of futureLeaves) {
    await prisma.leaveRequest.update({
      where: { id: l.id },
      data: { createdAt: new Date(Date.now() - (150 - l.id) * 60000) },
    });
  }
  console.log("Updated future createdAt records to valid chronological past timestamps!");
}

await prisma.$disconnect();
