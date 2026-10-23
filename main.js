const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parseBanks, endpointURL, sendTransaction } = require('./transaction');

let window;
let sending = false;
const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
async function readSettings() {
  try { return { banks: [], ...JSON.parse(await fs.readFile(settingsPath(), 'utf8')) }; }
  catch (error) { if (error.code === 'ENOENT') return { endpoint: '', banks: [] }; throw error; }
}
function handle(channel, action) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (event.sender !== window?.webContents || event.senderFrame?.url !== page) {
      return { ok: false, error: 'Unauthorized request.' };
    }
    try { return { ok: true, ...await action(...args) }; }
    catch (error) { return { ok: false, error: error.name === 'TimeoutError'
      ? 'Request timed out. Check the endpoint before retrying to avoid duplicates.' : error.message }; }
  });
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  handle('settings:get', async () => readSettings());
  handle('settings:save', async (value) => {
    const endpoint = value.endpoint.trim() ? endpointURL(value.endpoint.trim()) : '';
    const banks = parseBanks(value.banks);
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(`${settingsPath()}.tmp`, JSON.stringify({ endpoint, banks }), { mode: 0o600 });
    await fs.rename(`${settingsPath()}.tmp`, settingsPath());
    return { endpoint, banks };
  });
  handle('transaction:send', async (input) => {
    if (sending) throw new Error('A transaction is already being sent.');
    sending = true;
    try {
      const { endpoint, banks } = await readSettings();
      if (!endpoint) throw new Error('Save an endpoint in Settings first.');
      await sendTransaction(endpoint, input, banks);
    } finally { sending = false; }
  });
  function createWindow() {
    window = new BrowserWindow({
      width: 380, height: 600, useContentSize: true,
      resizable: false, maximizable: false, fullscreenable: false,
      title: 'CC Tracker', backgroundColor: '#f6f5f1',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.loadFile('index.html');
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
