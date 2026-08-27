import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL || "mysql://mysql_lms:vpu06ce5lny4pmdlhm3f@147.93.30.32:3308/leave_management";
const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!match) { console.error("Bad URL"); process.exit(1); }
const adapter = new PrismaMariaDb({ user: match[1], password: decodeURIComponent(match[2]), host: match[3], port: Number(match[4]), database: match[5].split("?")[0], allowPublicKeyRetrieval: true });
const prisma = new PrismaClient({ adapter });

const del = await prisma.holiday.deleteMany({
  where: {
    id: 2,
  },
});
console.log("DELETED_MISTAKEN_HOLIDAY:", del);
const holidays = await prisma.holiday.findMany();
console.log("REMAINING_HOLIDAYS:", holidays.map(h => ({ id: h.id, name: h.name, fromDate: h.fromDate, toDate: h.toDate })));
await prisma.$disconnect();
