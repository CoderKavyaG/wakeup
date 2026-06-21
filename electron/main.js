const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

let mainWindow = null
let tray = null
let nextProcess = null

const NEXT_PORT = 3000
const AGENT_PORT = 3131

function waitForNext(callback, retries = 20) {
  http.get(`http://localhost:${NEXT_PORT}`, () => callback())
    .on('error', () => {
      if (retries > 0) setTimeout(() => waitForNext(callback, retries - 1), 1000)
    })
}

function startNextServer() {
  if (!app.isPackaged) {
    console.log('[Electron] Running in development mode. Skipping standalone server spawn.');
    return;
  }
  nextProcess = spawn('node', ['.next/standalone/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: NEXT_PORT },
    windowsHide: true
  })
  nextProcess.stdout.on('data', d => console.log('[next]', d.toString()))
  nextProcess.stderr.on('data', d => console.error('[next]', d.toString()))
}

function startAgent() {
  if (!app.isPackaged) {
    console.log('[Electron] Running in development mode. Skipping Agent spawn.');
    return;
  }
  const agentProcess = spawn('node', ['devos-agent/index.js'], {
    cwd: path.join(__dirname, '..'),
    windowsHide: true
  })
  agentProcess.stdout.on('data', d => console.log('[agent]', d.toString()))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f11',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false
  })

  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const cookies = await mainWindow.webContents.session.cookies.get({ url: `http://localhost:${NEXT_PORT}` })
      const hasSession = cookies.some(c => c.name.includes('session-token'))
      console.log('[Electron] Checked auth session. Active session:', hasSession)
    } catch (e) {
      console.error('[Electron] Failed to inspect cookies:', e)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  const menu = Menu.buildFromTemplate([
    { label: 'Open DevOS', click: () => { if (mainWindow) mainWindow.focus(); else createWindow() } },
    { label: 'Restart', click: () => { app.relaunch(); app.exit(0) } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } }
  ])
  tray.setToolTip('DevOS')
  tray.setContextMenu(menu)
  tray.on('click', () => { if (mainWindow) mainWindow.focus() })
}

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.restore()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.hide()) // hide to tray, not quit
ipcMain.handle('capture-screenshot', async () => {
  if (!mainWindow) throw new Error('No active window');
  const image = await mainWindow.webContents.capturePage();
  return image.toJPEG(80).toString('base64');
})

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://local.wakeup.com:')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
})


const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.exit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    startNextServer()
    startAgent()
    createTray()
    waitForNext(() => createWindow())

    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    })
  })

  app.on('window-all-closed', () => {
    // Keep app running in tray — do NOT quit
  })

  app.on('before-quit', () => {
    if (nextProcess) nextProcess.kill()
  })
}
