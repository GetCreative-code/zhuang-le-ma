const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    title: 'zhuang le ma?',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#FFF5F5',
  });
  const isDev = !app.isPackaged;
  if (isDev) { mainWindow.loadURL('http://localhost:5173'); }
  else { mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')); }
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function sanitizeScript(script) {
  let s = (script || '').trim();
  const fenceMatch = s.match(/```(?:powershell|bash|sh|shell|ps1)?\s*\r?\n([\s\S]*?)```/i);
  if (fenceMatch) { s = fenceMatch[1].trim(); }
  else { s = s.replace(/^```[\w]*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, ''); }
  s = s.replace(/```[\w]*/g, '').trim();
  s = s.replace(/^#requires\s+-RunAsAdministrator\s*$/gim, '');
  return s.trim();
}

function writeScriptFile(scriptPath, content, platform) {
  if (platform === 'windows') { fs.writeFileSync(scriptPath, '\uFEFF' + content, 'utf8'); }
  else { fs.writeFileSync(scriptPath, content, 'utf8'); try { fs.chmodSync(scriptPath, 0o755); } catch (_) {} }
}

function sendOutput(type, data) {
  if (mainWindow) { mainWindow.webContents.send('script-output', { type, data }); }
}

ipcMain.handle('execute-script', async (event, { script, platform }) => {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const ext = platform === 'windows' ? '.ps1' : '.sh';
    const scriptPath = path.join(app.getPath('temp'), `zhuanglema_install_${timestamp}${ext}`);
    const cleanScript = sanitizeScript(script);
    let finalScript = platform === 'windows'
      ? ['# zhuang-le-ma install script', 'Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force', '$ErrorActionPreference = "Stop"', cleanScript].join('\r\n')
      : `#!/bin/bash\n# zhuang-le-ma install script\nset -e\n${cleanScript}`;

    try { writeScriptFile(scriptPath, finalScript, platform); }
    catch (err) { resolve({ success: false, exitCode: -1, output: '', errorOutput: `Write failed: ${err.message}` }); return; }

    if (platform === 'windows') {
      sendOutput('stdout', 'Requesting admin rights...\n');
      const proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { windowsHide: true });
      let output = '';
      proc.stdout.on('data', (data) => { const text = data.toString(); output += text; sendOutput('stdout', text); });
      proc.stderr.on('data', (data) => { const text = data.toString(); output += text; sendOutput('stderr', text); });
      proc.on('close', (code) => { try { fs.unlinkSync(scriptPath); } catch (_) {} resolve({ success: code === 0, exitCode: code, output, errorOutput: code !== 0 ? `Exit: ${code}` : '' }); });
      proc.on('error', (err) => { resolve({ success: false, exitCode: -1, output, errorOutput: `Error: ${err.message}` }); });
      return;
    }

    let proc = platform === 'macos'
      ? spawn('osascript', ['-e', `do shell script "bash '${scriptPath.replace(/'/g, "'\\''")}'" with administrator privileges`])
      : spawn('bash', [scriptPath]);

    let output = '', errorOutput = '';
    proc.stdout.on('data', (data) => { const text = data.toString(); output += text; sendOutput('stdout', text); });
    proc.stderr.on('data', (data) => { const text = data.toString(); errorOutput += text; sendOutput('stderr', text); });
    proc.on('close', (code) => { try { fs.unlinkSync(scriptPath); } catch (_) {} resolve({ success: code === 0, exitCode: code, output, errorOutput }); });
    proc.on('error', (err) => { resolve({ success: false, exitCode: -1, output, errorOutput: `Error: ${err.message}` }); });
  });
});

ipcMain.handle('get-platform', () => {
  const p = process.platform;
  if (p === 'win32') return 'windows';
  if (p === 'darwin') return 'macos';
  return 'linux';
});
