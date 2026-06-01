const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec: originalExec } = require('child_process');
const os = require('os');
const net = require('net');

// Wrapper to always hide the console window on Windows
const exec = (command, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options.windowsHide = true;
  return originalExec(command, options, callback);
};

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3131;

// GET /ports - returns array of listening ports
app.get('/ports', (req, res) => {
  const isWin = os.platform() === 'win32';
  
  if (isWin) {
    exec('netstat -ano | findstr LISTENING', (error, stdout) => {
      if (error) return res.json([]);
      const lines = stdout.split('\n').filter(l => l.trim());
      const ports = new Set();
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        // Protocol LocalAddress ForeignAddress State PID
        // TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 1234
        if (parts.length >= 2) {
          const localAddress = parts[1];
          const portMatch = localAddress.match(/:(\d+)$/);
          if (portMatch) ports.add(parseInt(portMatch[1], 10));
        }
      });
      res.json(Array.from(ports).sort((a, b) => a - b));
    });
  } else {
    exec('lsof -i -P -n | grep LISTEN', (error, stdout) => {
      if (error) return res.json([]);
      const lines = stdout.split('\n').filter(l => l.trim());
      const ports = new Set();
      lines.forEach(line => {
        const match = line.match(/:(\d+)\s+\(LISTEN\)/);
        if (match) ports.add(parseInt(match[1], 10));
      });
      res.json(Array.from(ports).sort((a, b) => a - b));
    });
  }
});

// POST /kill-port
app.post('/kill-port', (req, res) => {
  const { port } = req.body;
  if (!port) return res.status(400).json({ error: 'Missing port' });
  
  const isWin = os.platform() === 'win32';
  
  if (isWin) {
    exec('netstat -ano', (error, stdout) => {
      if (!stdout) return res.json({ success: true });
      const lines = stdout.split('\n');
      const pids = new Set();
      lines.forEach(l => {
        if (l.includes('LISTENING') && l.includes(`:${port}`)) {
          const parts = l.trim().split(/\s+/);
          if (parts.length >= 5) pids.add(parts[parts.length - 1]);
        }
      });
      pids.forEach(pid => {
        if (pid !== '0') exec(`taskkill /F /PID ${pid}`);
      });
      setTimeout(() => res.json({ success: true }), 500);
    });
  } else {
    exec(`lsof -t -i:${port} | xargs kill -9`, (error) => {
      res.json({ success: true });
    });
  }
});

// GET /files?path=X
app.get('/files', (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });
  
  try {
    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory()
    }));
    // Sort directories first
    result.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /open
app.post('/open', (req, res) => {
  const { path: targetPath, app: appToOpen } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });

  let cmd = '';
  const isWin = os.platform() === 'win32';

  if (appToOpen === 'vscode') {
    cmd = `code "${targetPath}"`;
  } else {
    // default open folder
    cmd = isWin ? `explorer "${targetPath}"` : `open "${targetPath}"`;
  }

  exec(cmd, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
});

// POST /launch
app.post('/launch', (req, res) => {
  const { app: appName } = req.body;
  let cmd = '';

  const isWin = os.platform() === 'win32';

  // Basic examples of custom launchers
  if (appName === 'VS Code') {
    cmd = 'code';
  } else if (appName === 'Terminal') {
    cmd = isWin ? 'start cmd' : 'open -a Terminal';
  } else if (appName === 'Claude (main)' || appName === 'Claude (work)') {
    // Assuming a local protocol or start command
    cmd = isWin ? 'start claude://' : 'open -a Claude';
  } else {
    cmd = isWin ? `start ${appName}` : `open -a "${appName}"`;
  }

  exec(cmd, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
});

let prevCpuTimes = null;

// GET /stats
app.get('/stats', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const cpus = os.cpus();
  let totalUser = 0;
  let totalSys = 0;
  let totalIdle = 0;

  cpus.forEach(cpu => {
    totalUser += cpu.times.user;
    totalSys += cpu.times.sys;
    totalIdle += cpu.times.idle;
  });

  const currentTimes = { totalUser, totalSys, totalIdle };
  let cpuPercent = 0;

  if (prevCpuTimes) {
    const userDiff = currentTimes.totalUser - prevCpuTimes.totalUser;
    const sysDiff = currentTimes.totalSys - prevCpuTimes.totalSys;
    const idleDiff = currentTimes.totalIdle - prevCpuTimes.totalIdle;

    const totalDiff = userDiff + sysDiff + idleDiff;
    if (totalDiff > 0) {
      cpuPercent = Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
    }
  }

  prevCpuTimes = currentTimes;

  res.json({
    cpu: cpuPercent,
    ram: ramPercent
  });
});

// GET /git
app.get('/git', (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });

  exec(`git branch --show-current`, { cwd: targetPath }, (error1, stdout1) => {
    const branch = error1 ? "" : stdout1.trim();
    
    exec(`git log -1 --pretty=%s`, { cwd: targetPath }, (error2, stdout2) => {
      const lastCommit = error2 ? "" : stdout2.trim();
      res.json({
        branch,
        commit: lastCommit
      });
    });
  });
});

// POST /restart
app.post('/restart', (req, res) => {
  res.json({ success: true, message: "Restarting agent..." });
  setTimeout(() => process.exit(0), 500);
});

// POST /scan-project

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
        result.description = fs.readFileSync(readmePath, 'utf8').substring(0, 200).replace(/\n/g, ' ').trim();
      } catch(e) {}
    }
  }

  const envPath = fs.existsSync(path.join(targetPath, '.env.local')) ? path.join(targetPath, '.env.local') : path.join(targetPath, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
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

  exec(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, async (error, stdout) => {
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

// GET /git-status-all
app.get('/git-status-all', async (req, res) => {
  const workspacesPath = path.join(__dirname, 'workspaces.json');
  let workspaces = [];
  if (fs.existsSync(workspacesPath)) {
    try {
      workspaces = JSON.parse(fs.readFileSync(workspacesPath, 'utf8'));
    } catch(e) {}
  }

  const results = await Promise.all(workspaces.map(async (targetPath) => {
    const name = path.basename(targetPath);
    const execPromise = (cmd) => new Promise(resolve => exec(cmd, { cwd: targetPath }, (err, stdout) => resolve(err ? '' : stdout.trim())));
    
    let branch = '', uncommitted = 0, ahead = 0, lastCommit = '';
    
    if (fs.existsSync(path.join(targetPath, '.git'))) {
      branch = await execPromise('git branch --show-current');
      
      const statusOutput = await execPromise('git status --porcelain');
      if (statusOutput) {
        uncommitted = statusOutput.split('\n').filter(l => l.trim()).length;
      }
      
      const aheadOutput = await execPromise('git log origin/HEAD..HEAD --oneline 2>/dev/null');
      if (aheadOutput) {
        ahead = aheadOutput.split('\n').filter(l => l.trim()).length;
      }
      
      lastCommit = await execPromise('git log -1 --pretty=%s');
    }
    
    return { path: targetPath, name, branch, uncommitted, ahead, lastCommit };
  }));

  res.json(results);
});

// GET /npm-scripts
app.get('/npm-scripts', (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });

  const pkgPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return res.json({ scripts: pkg.scripts || {} });
    } catch(e) {
      return res.status(500).json({ error: 'Failed to parse package.json' });
    }
  }
  res.json({ scripts: {} });
});

// POST /run-npm-script
app.post('/run-npm-script', async (req, res) => {
  const { path: targetPath, script } = req.body;
  if (!targetPath || !script) return res.status(400).json({ error: 'Missing path or script' });

  let portCmd = "";
  if (script === "dev" || script === "start") {
    // Find an open port starting at 3000
    const findOpenPort = async (startPort) => {
      let p = startPort;
      while (p < 3050) {
        const isOpen = await new Promise(resolve => {
          const server = net.createServer();
          server.listen(p, '127.0.0.1', () => {
            server.close(() => resolve(true));
          });
          server.on('error', () => resolve(false));
        });
        if (isOpen) return p;
        p++;
      }
      return startPort;
    };
    const openPort = await findOpenPort(3000);
    const isWin = os.platform() === 'win32';
    portCmd = isWin ? `set PORT=${openPort} && ` : `PORT=${openPort} `;
  }

  const isWin = os.platform() === 'win32';
  // Use originalExec because we WANT to pop up the terminal window here!
  const cmd = isWin 
    ? `start cmd /k "cd /d ${targetPath} && ${portCmd}npm run ${script}"`
    : `osascript -e 'tell app "Terminal" to do script "cd ${targetPath} && ${portCmd}npm run ${script}"'`;

  originalExec(cmd, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
});

// POST /register-workspace
app.post('/register-workspace', (req, res) => {
  const targetPath = req.body.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });

  const workspacesPath = path.join(__dirname, 'workspaces.json');
  let workspaces = [];
  if (fs.existsSync(workspacesPath)) {
    try {
      workspaces = JSON.parse(fs.readFileSync(workspacesPath, 'utf8'));
    } catch(e) {}
  }

  if (!workspaces.includes(targetPath)) {
    workspaces.push(targetPath);
    fs.writeFileSync(workspacesPath, JSON.stringify(workspaces, null, 2));
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`DevOS Agent running on port ${PORT}`);
});
