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

app.listen(PORT, () => {
  console.log(`DevOS Agent running on port ${PORT}`);
});
