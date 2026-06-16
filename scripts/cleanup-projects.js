const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/wakeup";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up projects in DB...");

  const allProjects = await prisma.project.findMany();
  
  const toKeep = [];
  const toDelete = [];

  for (const p of allProjects) {
    const nameLower = p.name.trim().toLowerCase();
    
    // Keep list:
    // 1. wakeup (only if it has folderPath)
    // 2. topmate, drift-chat, privatr-ade, aadmi dhundho yojna, topmate clone
    if (nameLower === "wakeup") {
      if (p.folderPath) {
        toKeep.push(p);
      } else {
        toDelete.push(p);
      }
    } else if (
      nameLower === "topmate" || 
      nameLower === "drift-chat" || 
      nameLower === "privatr-ade" || 
      nameLower === "aadmi dhundho yojna" || 
      nameLower === "topmate clone"
    ) {
      // De-duplicate if there are multiple of these
      const existsInKeep = toKeep.some(k => k.name.trim().toLowerCase() === nameLower);
      if (!existsInKeep) {
        toKeep.push(p);
      } else {
        toDelete.push(p);
      }
    } else {
      toDelete.push(p);
    }
  }

  console.log(`Keeping ${toKeep.length} projects:`);
  toKeep.forEach(p => console.log(` - ${p.name} (${p.id})`));

  console.log(`Deleting ${toDelete.length} projects:`);
  for (const p of toDelete) {
    console.log(` - ${p.name} (${p.id})`);
    
    // Delete commits first
    await prisma.commit.deleteMany({
      where: { projectId: p.id }
    });
    
    // Delete project (cascades where setup, otherwise deletes directly)
    await prisma.project.delete({
      where: { id: p.id }
    });
  }

  console.log("Cleanup completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
