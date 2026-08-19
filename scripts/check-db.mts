import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL || "";
const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
if (!match) { console.error("Bad URL"); process.exit(1); }
const adapter = new PrismaMariaDb({ user: match[1], password: decodeURIComponent(match[2]), host: match[3], port: Number(match[4]), database: match[5].split("?")[0] });
const prisma = new PrismaClient({ adapter });

const users = await prisma.user.count();
const roles = await prisma.roleDefinition.count();
const leaves = await prisma.leaveType.count();
console.log(`Users: ${users} | Roles: ${roles} | Leave Types: ${leaves}`);
await prisma.$disconnect();
