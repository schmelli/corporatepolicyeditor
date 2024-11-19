const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    
    // Open DevTools in development mode
    if (process.argv.includes('--debug')) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers for document operations
ipcMain.handle('save-document', async (event, document) => {
    // TODO: Implement document saving
});

ipcMain.handle('load-document', async (event, documentId) => {
    // TODO: Implement document loading
});

ipcMain.handle('export-document', async (event, { document, format }) => {
    // TODO: Implement document export
});
