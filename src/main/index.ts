import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { getDb, closeDb } from './database/connection'
import { runMigrations } from './database/schema'
import { registerHandlers } from './ipc/handlers'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const splashHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1677ff,#0958d9);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;overflow:hidden;user-select:none}
.splash{text-align:center;color:#fff;animation:fadeIn .4s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.icon{width:64px;height:64px;background:rgba(255,255,255,.18);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:30px;font-weight:800}
h1{font-size:24px;font-weight:700;letter-spacing:-.3px;margin-bottom:3px}
.tagline{font-size:12px;opacity:.8;margin-bottom:24px}
.divider{width:36px;height:2px;background:rgba(255,255,255,.25);margin:0 auto 18px;border-radius:1px}
.dev{font-size:10px;opacity:.5;margin-bottom:2px;letter-spacing:1px;text-transform:uppercase}
.dev-name{font-size:13px;font-weight:600;opacity:.85}
.version{font-size:10px;opacity:.35;margin-top:4px}
</style>
</head>
<body>
<div class="splash">
<div class="icon">FP</div>
<h1>Fatoora Pro</h1>
<div class="tagline">Professional Invoice Management Software</div>
<div class="divider"></div>
<div class="dev">Developed by</div>
<div class="dev-name">Elbara Mouaffak</div>
<div class="version">Version 1.0.0</div>
</div>
</body>
</html>`

let mainWindow: BrowserWindow | null = null
let initDone = false
let mainReady = false

const iconPath = isDev
  ? path.join(__dirname, '../../public/icon.png')
  : path.join(process.resourcesPath, 'public', 'icon.png')

function finishInit(splash: BrowserWindow): void {
  initDone = true
  if (mainReady && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    if (!splash.isDestroyed()) splash.close()
  }
}

function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 380, height: 440,
    frame: false, resizable: false, center: true,
    transparent: true, skipTaskbar: true, alwaysOnTop: true, show: false
  })
  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  splash.once('ready-to-show', () => splash.show())
  return splash
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Fatoora Pro',
    icon: iconPath,
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools()
      }
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainReady = true
    if (initDone && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      const splash = BrowserWindow.getAllWindows().find(w => w !== mainWindow && !w.isDestroyed())
      if (splash && !splash.isDestroyed()) splash.close()
    }
  })
}

app.whenReady().then(() => {
  const splash = createSplash()
  createMainWindow()

  const db = getDb()
  let migrationError: string | null = null

  try {
    runMigrations(db)
  } catch (err) {
    migrationError = err instanceof Error ? err.message : String(err)
    console.error('[Startup] Migration failed:', migrationError)
  }

  registerHandlers(db)

  if (migrationError) {
    dialog.showErrorBox(
      'Database Migration Error',
      `A database migration failed:\n${migrationError}\n\nThe application will try to continue, but some features may not work. Please restart or reinstall if the issue persists.`
    )
  }

  finishInit(splash)
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
