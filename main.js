const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win; 

async function createWindow () {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration : false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})



ipcMain.on("toMain", (event, args) => {
  fs.readFile("path/to/file", (error, data) => {
    // Do something with file contents

    // Send result back to renderer process
    win.webContents.send("fromMain", responseObj);
  });
});

ipcMain.on('resize-window', (event, width, height) => {
    let browserWindow = BrowserWindow.fromWebContents(event.sender)
    browserWindow.setSize(width, height);
    
})