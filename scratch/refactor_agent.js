const fs = require('fs');

const path = 'devos-agent/index.js';
let content = fs.readFileSync(path, 'utf8');

// The original scan-project route is from:
// app.post('/scan-project', async (req, res) => {
// to the end of the file where app.listen is.

const extractRegex = /app\.post\('\/scan-project'[\s\S]*?res\.json\(result\);\n\}\);/;

const scanFunctionCode = `
async function scanDirectory(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) throw new Error('Path is not a directory');
  } catch (err) {
    throw new Error('Invalid path');
  }

  const result = {
    name: path.basename(targetPath),
    description: '',
    tags: [],
    githubUrl: '',
    lastCommitMessage: '',
    deployHints: [],
    folderPath: targetPath
  };

  const pkgPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) result.name = pkg.name;
      if (pkg.description) result.description = pkg.description;
      
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps['next']) result.tags.push('Next.js');
      if (allDeps['react']) result.tags.push('React');
      if (allDeps['vue']) result.tags.push('Vue');
      if (allDeps['svelte']) result.tags.push('Svelte');
      if (allDeps['@angular/core']) result.tags.push('Angular');
      if (allDeps['vite']) result.tags.push('Vite');
      if (allDeps['@nestjs/core']) result.tags.push('NestJS');
      if (allDeps['express'] || allDeps['fastapi'] || allDeps['flask']) result.tags.push('Backend');
      if (allDeps['prisma']) result.tags.push('Prisma');
      if (allDeps['mongoose'] || allDeps['mongodb']) result.tags.push('MongoDB');
      if (allDeps['firebase']) result.tags.push('Firebase');
      if (allDeps['@supabase/supabase-js']) result.tags.push('Supabase');
      if (allDeps['tailwindcss']) result.tags.push('TailwindCSS');
      if (allDeps['typescript']) result.tags.push('TypeScript');
    } catch(e) {}
  }

  // Language/Tech detection for generic projects
  if (fs.existsSync(path.join(targetPath, 'requirements.txt')) || fs.existsSync(path.join(targetPath, 'main.py'))) result.tags.push('Python');
  if (fs.existsSync(path.join(targetPath, 'pom.xml')) || fs.existsSync(path.join(targetPath, 'build.gradle'))) result.tags.push('Java');
  if (fs.existsSync(path.join(targetPath, 'go.mod'))) result.tags.push('Go');
  if (fs.existsSync(path.join(targetPath, 'Cargo.toml'))) result.tags.push('Rust');
  if (fs.existsSync(path.join(targetPath, 'composer.json'))) result.tags.push('PHP');
  if (fs.existsSync(path.join(targetPath, 'docker-compose.yml')) || fs.existsSync(path.join(targetPath, 'Dockerfile'))) result.tags.push('Docker');

  if (!result.description) {
    const readmePath = path.join(targetPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      try {
        result.description = fs.readFileSync(readmePath, 'utf8').substring(0, 200).replace(/\\n/g, ' ').trim();
      } catch(e) {}
    }
  }

  const envPath = fs.existsSync(path.join(targetPath, '.env.local')) ? path.join(targetPath, '.env.local') : path.join(targetPath, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\\n').forEach(line => {
        const key = line.split('=')[0].trim();
        if (key === 'DATABASE_URL' && !result.tags.includes('PostgreSQL')) result.tags.push('PostgreSQL');
        if (key.startsWith('NEXT_PUBLIC_') && !result.tags.includes('Frontend')) result.tags.push('Frontend');
        if ((key.startsWith('RAILWAY_') || key.startsWith('VERCEL_')) && !result.deployHints.includes(key)) {
          result.deployHints.push(key);
        }
      });
    } catch(e) {}
  }

  if (fs.existsSync(path.join(targetPath, '.git'))) {
    try {
      const execPromise = (cmd) => new Promise(resolve => exec(cmd, { cwd: targetPath }, (err, stdout) => resolve(err ? '' : stdout.trim())));
      const url = await execPromise('git remote get-url origin');
      if (url) result.githubUrl = url;
      const msg = await execPromise('git log -1 --pretty=%s');
      if (msg) result.lastCommitMessage = msg;
    } catch(e) {}
  }

  result.tags = [...new Set(result.tags)];
  return result;
}

app.post('/scan-project', async (req, res) => {
  const targetPath = req.body.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });
  try {
    const data = await scanDirectory(targetPath);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/pick-and-scan-folder', async (req, res) => {
  const isWin = os.platform() === 'win32';
  if (!isWin) return res.status(400).json({ error: 'Folder picker only supported on Windows' });

  const psScriptPath = path.join(__dirname, 'picker.ps1');
  if (!fs.existsSync(psScriptPath)) {
    return res.status(500).json({ error: 'picker.ps1 not found' });
  }

  exec(\`powershell -ExecutionPolicy Bypass -File "\${psScriptPath}"\`, async (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    const pickedPath = stdout.trim();
    if (!pickedPath) return res.status(400).json({ error: 'No folder selected' });
    
    try {
      const data = await scanDirectory(pickedPath);
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
});
`;

content = content.replace(extractRegex, scanFunctionCode);

fs.writeFileSync(path, content, 'utf8');
console.log("Refactored devos-agent index.js successfully.");
