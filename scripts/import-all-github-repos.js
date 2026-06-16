const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/wakeup";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Restoring GitHub repositories into DB...");

  // Get user ID of Kavya
  const user = await prisma.user.findFirst({
    where: { email: "kavya@devos.local" }
  });

  if (!user) {
    console.error("User kavya@devos.local not found!");
    return;
  }

  const userId = user.id;

  // Fetch repositories from GitHub public API
  const username = "coderkavyag";
  let repos = [];
  
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "DevOS-Restore-Agent"
      }
    });

    if (!res.ok) {
      console.error(`Failed to fetch page ${page}: ${res.statusText}`);
      break;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    repos = [...repos, ...data];
  }

  console.log(`Fetched ${repos.length} repositories from GitHub.`);

  let createdCount = 0;

  for (const repo of repos) {
    // Check if project already exists
    const existing = await prisma.project.findFirst({
      where: {
        userId,
        name: {
          equals: repo.name.trim(),
          mode: "insensitive"
        }
      }
    });

    if (existing) {
      console.log(`Project "${repo.name}" already exists. Skipping.`);
      continue;
    }

    // Insert project
    await prisma.project.create({
      data: {
        name: repo.name,
        description: repo.description || `GitHub Repository: ${repo.name}`,
        status: repo.archived ? "completed" : "active",
        tags: repo.language ? [repo.language] : ["GitHub"],
        githubUrl: repo.html_url,
        techStack: repo.language ? [repo.language] : [],
        summary: repo.description || "",
        momentumScore: repo.stargazers_count ? repo.stargazers_count * 10 : 0,
        projectHealth: 100.0,
        completionPercentage: 50.0,
        userId,
        phase: "sketching", // default all imported repos to sketching phase
        workspace: "main",
        type: "code",
        priority: "medium",
      }
    });

    console.log(`Registered project: ${repo.name}`);
    createdCount++;
  }

  console.log(`\nSuccessfully imported ${createdCount} projects.`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
