import {app, BrowserWindow, protocol, session } from "electron";
import JSZip from "jszip";
import fs from "fs";

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != "darwin") {
      app.quit();
  }
});

// Read content in epub
function readZipContent(epubPath, epubContentPath, callback) {
  fs.readFile(epubPath, function(err, data) {
    if (err) {
      return console.log(err);
    }
    
    JSZip.loadAsync(data)
      .then(function (zip) {
        var epubFile = zip.file(epubContentPath);
        
        if (epubFile == null && epubContentPath.startsWith("OPS")) {
          // Try EPUB, OEBPS sub directory 
          epubFile = zip.file("EPUB" + epubContentPath.substring(3));
          
          if (epubFile == null) {
            console.log('Unable to open content', epubPath, epubContentPath);
            return callback(null);
          } 
        }
        
        epubFile.async("string").then(function(data) {
          callback(data);
        });
      })
      .catch(function (err) {
        console.log('Unable to parse', epubPath, epubContentPath);
        console.log(err);
        return callback(null);
      });
  });
}
      
      

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", function() {
  // Fake http server for epub files
  protocol.registerStringProtocol("epub", function(request, callback) {
      var epubFullPath = request.url.substr(7);
      var epubPathEndIndex = epubFullPath.indexOf(".epub") + 5;
      var epubPath = epubFullPath.substr(0, epubPathEndIndex);
      var epubContentPath = epubFullPath.substr(epubPathEndIndex + 1);
      console.log(epubPath, epubContentPath);
      
      readZipContent(epubPath, epubContentPath, function(data) {
        callback(data);
      });
  }, function (error) {        
      if (error)
          console.error("Failed to register protocol");
  });

  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000, height: 600
  });

  // and load the index.html of the app.
  mainWindow.loadURL("file://" + __dirname + "/../renderer/index.html");
  
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    var url = details.url;
    
    if (url.startsWith("http://epub.local")) {
      var url = "epub://" + url.substr(17);
      return callback({cancel: false, redirectURL: url});
    } 
    
    return callback({cancel: false});
  });
  
  // Only open dev tools in dev environment
  if(process.env.ENVIRONMENT === "DEV") {
    // Open the DevTools.
    mainWindow.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});