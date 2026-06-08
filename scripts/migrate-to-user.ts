import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Manually parse .env file to set environment variables
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join("=").trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    });
    console.log("Loaded .env variables");
  }
} catch (e) {
  console.error("Failed to load .env file:", e);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting migration to user...");

  // 1. Create or find master user "Kavya"
  const email = "kavya@devos.local";
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash("password123", 12);
    user = await prisma.user.create({
      data: {
        name: "Kavya",
        email,
        password: hashedPassword,
      },
    });
    console.log(`Created user Kavya (${user.id})`);
  } else {
    console.log(`Found existing user Kavya (${user.id})`);
  }

  const userId = user.id;

  // 2. Update all existing records to have this userId
  const projects = await prisma.project.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${projects.count} projects`);

  const tasks = await prisma.task.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${tasks.count} tasks`);

  const notes = await prisma.note.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${notes.count} notes`);

  const urls = await prisma.url.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${urls.count} urls`);

  const layouts = await prisma.layoutState.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${layouts.count} layouts`);

  const insights = await prisma.aIInsight.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${insights.count} insights`);

  const githubCaches = await prisma.githubCache.updateMany({
    where: { userId: null },
    data: { userId },
  });
  console.log(`Updated ${githubCaches.count} githubCaches`);

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
