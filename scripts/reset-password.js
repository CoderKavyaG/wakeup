const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/wakeup";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log("Existing Users in DB:");
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`);
  });

  if (users.length === 0) {
    console.log("No users found in database.");
    return;
  }

  // Reset the password for the first user
  const targetUser = users[0];
  const newPassword = "password123";
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { password: hashedPassword }
  });

  console.log(`\nSuccessfully reset password for ${targetUser.email} to: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
