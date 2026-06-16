const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/wakeup";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Importing local workspaces into DB...");

  const user = await prisma.user.findFirst({
    where: { email: "kavya@devos.local" }
  });

  if (!user) {
    console.error("User kavya@devos.local not found!");
    return;
  }

  const userId = user.id;

  const workspacesPath = path.join(__dirname, "..", "devos-agent", "workspaces.json");
  if (!fs.existsSync(workspacesPath)) {
    console.log("No workspaces.json found.");
    return;
  }

  const workspaces = JSON.parse(fs.readFileSync(workspacesPath, "utf8"));
  let imported = 0;

  for (const dir of workspaces) {
    // Basic sanitation
    if (!dir || dir.includes("&") || dir.includes("|") || dir.includes(";")) {
      console.log(`Skipping invalid or suspicious path: ${dir}`);
      continue;
    }

    try {
      if (!fs.existsSync(dir)) {
        console.log(`Path does not exist on filesystem: ${dir}`);
        continue;
      }
    } catch (e) {
      console.log(`Error checking path: ${dir}`);
      continue;
    }

    const name = path.basename(dir);

    // Check if project already exists in DB (by folderPath or name)
    const existing = await prisma.project.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { folderPath: { equals: dir, mode: "insensitive" } }
        ]
      }
    });

    if (existing) {
      console.log(`Project "${name}" already registered in DB. Updating folderPath.`);
      await prisma.project.update({
        where: { id: existing.id },
        data: { folderPath: dir }
      });
      continue;
    }

    // Create project
    await prisma.project.create({
      data: {
        name,
        description: `Local Workspace: ${name}`,
        status: "active",
        tags: ["Local"],
        folderPath: dir,
        projectHealth: 100.0,
        momentumScore: 0.0,
        completionPercentage: 0.0,
        userId,
        phase: "in_development",
        workspace: "main",
        type: "code",
        priority: "medium",
      }
    });

    console.log(`Registered local workspace: ${name} (${dir})`);
    imported++;
  }

  console.log(`\nImported ${imported} local workspaces.`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
