const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

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

app.listen(PORT, () => {
  console.log(`DevOS Agent running on port ${PORT}`);
});
