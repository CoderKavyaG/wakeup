const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.project.deleteMany({
    where: {
      name: { in: ['DevOS Dashboard', 'WebRTC Stranger Chat', 'Editorial News Scraper'] }
    }
  });
  console.log('Mock projects deleted successfully');
}
run().catch(console.error).finally(() => prisma.$disconnect());
