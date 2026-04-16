const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

const WINDOW_WIDTH = 248;
const WINDOW_HEIGHT = 188;
const EDGE_MARGIN = 12;
const BOTTOM_SURFACE_OVERLAP = 18;
const SLEEP_INSET_X = 26;
const SLEEP_INSET_Y = 22;
const GUARD_RIGHT_INSET = -20;
const WATCH_INSET_X = 64;

/** @type {'sleep' | 'idle' | 'curious' | 'guard' | 'watch'} */
let currentState = 'idle';
/** @type {BrowserWindow | null} */
let mainWindow = null;

function getWorkArea() {
  return screen.getPrimaryDisplay().workArea;
}

function getStateBounds(state) {
  const area = getWorkArea();
  const bottomSurfaceY = area.y + area.height - WINDOW_HEIGHT + BOTTOM_SURFACE_OVERLAP;
  const rightX = area.x + area.width - WINDOW_WIDTH - EDGE_MARGIN;
  const guardX = rightX + GUARD_RIGHT_INSET;
  const leftX = area.x + EDGE_MARGIN;
  const middleX = area.x + Math.round((area.width - WINDOW_WIDTH) / 2);

  switch (state) {
    case 'sleep':
      return {
        x: area.x + SLEEP_INSET_X,
        y: area.y + SLEEP_INSET_Y,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      };
    case 'idle':
      return { x: leftX, y: bottomSurfaceY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
    case 'curious':
      return { x: middleX, y: bottomSurfaceY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
    case 'guard':
      return { x: guardX, y: bottomSurfaceY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
    case 'watch':
      return {
        x: Math.max(leftX, guardX - WATCH_INSET_X),
        y: bottomSurfaceY,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      };
    default:
      return { x: leftX, y: bottomSurfaceY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
  }
}

function moveToState(state) {
  currentState = state;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.setBounds(getStateBounds(state), true);
  mainWindow.webContents.send('state-changed', {
    state,
    workArea: getWorkArea(),
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    ...getStateBounds(currentState),
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.handle('get-state', () => ({
    state: currentState,
    workArea: getWorkArea(),
  }));

  ipcMain.on('set-state', (_event, state) => {
    moveToState(state);
  });

  ipcMain.on('close-shell', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  createWindow();

  screen.on('display-metrics-changed', () => {
    moveToState(currentState);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
