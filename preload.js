//todo: pridat pocitadlo word per second



window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
});

  let heatmapRadius, minOpacity, maxOpacity, heatmapBlur, maxDatapoints, dataPts, ratio;
  let isGenerateHeatmap = false;
  let isGenerateScanpath = false;
  let fixationWidth = 0;
  let fixationHeight = 0;

  let fixationSumTimeTotal = 0;
  let fixationSumTimeText = 0;
  let fixationSumTimeImage = 0;

  let fixationCountTotal = 0;
  let fixationCountText = 0;
  let fixationCountImage = 0;


  let regressionCount = 0;



let h337 = require('heatmap.js');
function GenerateHeatmap(containerDivId, gazeData, width, h) {
  let heatmapDiv = document.getElementById(containerDivId);
  let height = h;
  if (height == 0) {
    height = 1280;
  }

  heatmapDiv.setAttribute("style", "width: " + width + "px; height: " + height + "px; margin: 0px; display:block; z-index:50");

  let heatmapConfig = {
    container: heatmapDiv,
    radius: heatmapRadius,
    maxOpacity: maxOpacity,
    minOpacity: minOpacity,
    blur: heatmapBlur
  };

  heatmap = h337.create(heatmapConfig);
  heatmap.setData({
    max: maxDatapoints,
    data: [{ x: 1, y: 1, value: 0}]
  });

  gazeData.every(function (row) {
    if (row[0] > 0 && row[1] > 0) {

      let dataPoint = {
        x: row[0], // x coordinate of the datapoint, a number
        y: row[1], // y coordinate of the datapoint, a number
        value: dataPts // the value at datapoint(x, y)
      };
      
      heatmap.addData(dataPoint);
    }
    return true;
  });
}



function createCanvas(id, width, height) {

  let c = document.createElement("canvas");
  c.setAttribute("id", id);
  c.setAttribute("width", width);
  c.setAttribute("height", height);
  return c;
}


async function GenerateHeatmapStep(containerDivId, gazeData, startingTime, step, width, h) {
  const heatmapDiv = document.getElementById(containerDivId);
  const endingTime = startingTime + step;

  let height = h;
  if (height == 0) {
    height = 1280;
  }
  const heatmapConfig = {
    container: heatmapDiv,
    radius: heatmapRadius,
    maxOpacity: maxOpacity,
    minOpacity: minOpacity,
    blur: heatmapBlur
  };

  heatmapDiv.setAttribute("style", "width: " + width + "px; height: " + height + "px; margin: 0px; display:block; z-index:50");

  heatmap = h337.create(heatmapConfig);
  heatmap.setData({
    max: maxDatapoints,
    data: [{ x: 0, y: 0, value: 0}]
  });

  gazeData.every(function (row) {
    
      if (startingTime <= row[2]) {

        if (row[0] > 0 && row[1] > 0) {

          let dataPoint = {
            x: row[0], // x coordinate of the datapoint, a number
            y: row[1], // y coordinate of the datapoint, a number
            value: dataPts // the value at datapoint(x, y)
          };
          
          heatmap.addData(dataPoint);
        }
    }
    if (row[2] >= endingTime) {
      return false;
    }
    return true;
  });
}



async function GenerateScanpath(scanpath_canvas, gazeData) {

  let c = scanpath_canvas;
  let ctx = c.getContext("2d");
  let prevX = 0;
  let prevY = 0;
  let curX = 0;
  let curY = 0;

  gazeData.forEach(function (row) {

    if (row[0] > 0 && row[1] > 0) {
      curX = row[0];
      curY = row[1];
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      prevX = curX;
      prevY = curY;
    }
  });
}




async function GenerateScanpathStep(scanpath_canvas, gazeData, startingTime, step) {
  let c = scanpath_canvas;
  let ctx = c.getContext("2d");
  let prevX = 0;
  let prevY = 0;
  let curX = 0;
  let curY = 0;

  let endingTime = startingTime + step;
  gazeData.every(function (row) {
    if (startingTime <= row[2]) {
      if (row[0] > 0 && row[1] > 0) {
        curX = row[0];
        curY = row[1];
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
        prevX = curX;
        prevY = curY;
      }
    }
    if (row[2] >= endingTime) {
      return false;
    }
    return true;
  });
  return endingTime;
}


// note that the fs package does not exist on a normal browser

const { contextBridge, ipcRenderer } = require('electron');

let gazeData = new Array();
let startingTime = 0.0;

let textTime = 0.0;
let imageTime = 0.0;

contextBridge.exposeInMainWorld(
    "gaze",
    {
      clearGaze: (containerDivId) => {
        document.getElementById(containerDivId).innerHTML = "";
        heatmapRadius = minOpacity = maxOpacity = heatmapBlur = maxDatapoints = dataPts = null;
         fixationWidth = 0;
         fixationHeight = 0;
      
         fixationSumTimeTotal = 0;
         fixationSumTimeText = 0;
         fixationSumTimeImage = 0;


         fixationCountTotal = 0;
         fixationCountText = 0;
         fixationCountImage = 0;
         regressionCount = 0;

        gazeData = null;
        gazeData = new Array;
      },

      setHeatmapParameters : (hr, mino, maxo, blur, maxDtps, dtps, rt, genH, genS, fW, fH) =>
      {
        heatmapRadius = hr;
        minOpacity = mino;
        maxOpacity = maxo;
        heatmapBlur = blur;
        maxDatapoints = maxDtps;
        dataPts = dtps;
        ratio = rt;
        isGenerateHeatmap = genH;
        isGenerateScanpath = genS;
        fixationWidth = fW;
        fixationHeight = fH;
      },

      getGaze: () => { return gazeData ;},
      getStartingTime: () => { return startingTime ;},

      exportHeatmapCanvasAsImage: () => {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('download', 'heatmap.png');
        let canvasArray = document.getElementsByClassName('heatmap-canvas');
        let dataURL = canvasArray[0].toDataURL('image/png');
        let url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
        downloadLink.setAttribute('href', url);
        downloadLink.click();    
      },

      exportScanpathCanvasAsImage: () => {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('download', 'scanpath.png');
        let canv = document.getElementById('scanpath_canvas');
        let dataURL = canv.toDataURL('image/png');
        let url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
        downloadLink.setAttribute('href', url);
        downloadLink.click();
      },


      loadGazeBulk: async (gazePathListID, timeInterval, containerDivId) => {
        let fs = require('fs')
        let gazePathList = document.getElementById(gazePathListID).files;
        let canvasWidth = 1920;
        let canvasHeight = 1080;

        for (let i = 0; i< gazePathList.length; i++) {
          console.log("Loading file: " + (i+1) + " of " + gazePathList.length);
            const data = fs.readFileSync(gazePathList[i].path);
            let lines = data.toString().split('\n');
            let gazeWidth  = parseInt(lines[0].split(",")[0]);
            let gazeHeight = parseInt(lines[0].split(",")[1]);
            let widthRatio = canvasWidth/ gazeWidth;
            let heightRatio = canvasHeight/gazeHeight;

            for (let i = 1; i< lines.length; i++) {
              let x = parseInt(lines[i].split(",")[0]) * widthRatio;
              let y = parseInt(lines[i].split(",")[1]) * heightRatio;
              let clock = parseInt(lines[i].split(",")[2]);

              if (i>1) {
                timeDiff = clock - parseInt(lines[i-1].split(",")[2]);
                if (y > canvasHeight/ratio && y > 0) imageTime +=timeDiff;
                if (y <= canvasHeight/ratio && y > 0) textTime += timeDiff;
              }
              gazeData.push([x,y,clock]);
            }
          console.log("Finished loading file: " + (i+1) + " of " + gazePathList.length);

        }
        let containerDiv = document.getElementById(containerDivId);
            let canvas = document.createElement('canvas');
            canvas.id     = "GazeLayer";
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.zIndex   = 5;
            canvas.style.position = "absolute";
            canvas.style.border   = "1px solid";
            let scanpath = createCanvas("scanpath_canvas", canvasWidth, canvasHeight);
        
        if (timeInterval == 0 ) {
          if (isGenerateScanpath) { 
            await GenerateScanpath(scanpath, gazeData);
            scanpath.style.position = "absolute"
            scanpath.style.zIndex   = 100;
            containerDiv.appendChild(scanpath);
          }
          
          if (isGenerateHeatmap) { 
            await GenerateHeatmap(containerDivId, gazeData, canvasWidth, canvasHeight);
            let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
            heatmap.style.zIndex   = 200;
          }

          containerDiv.appendChild(canvas);
          ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);

          } else {
            let step = timeInterval * 1000;
            startingTime = gazeData[1][2];
            if (isGenerateScanpath) { 
              await GenerateScanpathStep(scanpath, gazeData, startingTime, step).then(scanpath.style.position = "absolute");
              scanpath.style.position = "absolute"
              scanpath.style.zIndex   = 100;
              containerDiv.appendChild(scanpath);
            }
            if (isGenerateHeatmap) {
            GenerateHeatmapStep(containerDivId, gazeData, startingTime, step, canvasWidth, canvasHeight) ;
            let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
            heatmap.style.zIndex   = 200;
            }
            containerDiv.appendChild(canvas);
            ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);
          }



      },


      loadGaze: async (gazePath, screenPath, timeInterval, containerDivId) => {

        let fs = require('fs');        

        fs.readFile(gazePath, async function (err, data) {
            if (err) {
                return console.error(err);
            }
            let lines = data.toString().split('\n');

            let startTime = parseInt(lines[1].split(",")[2]);
            let endTime = parseInt(lines[lines.length - 2].split(",")[2]);

            imageTime = 0.0;
            textTime = 0.0;
            let seconds = (endTime - startTime) / 1000;
            let timeSpent = document.getElementById("timeSpent");
            timeSpent.innerHTML = seconds + " s";



            let canvasWidth = parseInt(lines[0].split(",")[0]);
            let canvasHeight = parseInt(lines[0].split(",")[1]);

            let isFixationCounted = false;


            for (let i = 1; i< lines.length; i++) {
              let x = parseInt(lines[i].split(",")[0]);
              let y = parseInt(lines[i].split(",")[1]);
              let clock = parseInt(lines[i].split(",")[2]);

              if (i>1) {
                timeDiff = clock - parseInt(lines[i-1].split(",")[2]);
                if (y > canvasHeight/ratio && y > 0) imageTime +=timeDiff;
                if (y <= canvasHeight/ratio && y > 0) textTime += timeDiff;

                if (i>2) {
                  let prevX = parseInt(lines[i-1].split(",")[0]);
                  let prevY = parseInt(lines[i-1].split(",")[1]);

                  if ((Math.abs(x - prevX) < fixationWidth) && (Math.abs(y - prevY) < fixationHeight) && y > 0 ) {
                    if (!isFixationCounted) { 
                      
                      if (y > canvasHeight/ratio) {
                        fixationCountImage++;
                      }
                      if (y <= canvasHeight/ratio) {
                        fixationCountText++;
                      }
                      isFixationCounted = true;
                      fixationCountTotal++;
                      
                    }

                    if (y > canvasHeight/ratio) {
                      fixationSumTimeImage += timeDiff;
                    }
                    if (y <= canvasHeight/ratio) {
                      fixationSumTimeText += timeDiff;
                    }
                    fixationSumTimeTotal += timeDiff;
                  } else {
                    isFixationCounted = false;
                  }

                  if (((x + fixationWidth + 1) < prevX ) && (Math.abs(y - prevY) < fixationHeight)) {
                    if (y <= canvasHeight/ratio && y > 0) {
                      regressionCount++;                    
                    }
                  }
                }
              }
              gazeData.push([x,y,clock]);
            }

            let fixationMeanTotal = fixationSumTimeTotal/fixationCountTotal;
            let fixationMeanTotalLabel = document.getElementById("fixationMeanTotal");
            fixationMeanTotalLabel.innerHTML = fixationMeanTotal + " ms";

            let fixationMeanText = fixationSumTimeText/fixationCountText;
            let fixationMeanTextLabel = document.getElementById("fixationMeanText");
            fixationMeanTextLabel.innerHTML = fixationMeanText + " ms";

            let fixationMeanImage = fixationSumTimeImage/fixationCountImage;
            let fixationMeanImageLabel = document.getElementById("fixationMeanImage");
            fixationMeanImageLabel.innerHTML = fixationMeanImage + " ms";

            let fixationCountTotalLabel = document.getElementById("fixationCountTotal");
            fixationCountTotalLabel.innerHTML = fixationCountTotal;
            let fixationCountTextLabel = document.getElementById("fixationCountText");
            fixationCountTextLabel.innerHTML = fixationCountText;
            let fixationCountImageLabel = document.getElementById("fixationCountImage");
            fixationCountImageLabel.innerHTML = fixationCountImage;

            let regressionCountText = document.getElementById("regressionCount");
            regressionCountText.innerHTML = regressionCount;

            let textSeconds = textTime / 1000;
            let timeSpentText = document.getElementById("timeSpentText");
            timeSpentText.innerHTML =  textSeconds+ " s";

            let imageSeconds = imageTime / 1000;
            let timeSpentImage = document.getElementById("timeSpentImage");
            timeSpentImage.innerHTML =  imageSeconds + " s";            

            let containerDiv = document.getElementById(containerDivId);
            let canvas = document.createElement('canvas');
            canvas.id     = "GazeLayer";
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.zIndex   = 5;
            canvas.style.position = "absolute";
            canvas.style.border   = "1px solid";

            
            let context=canvas.getContext('2d');
            let image=new Image();
            image.onload= await function(){
            context.drawImage(image,0,0);
            };
            image.src=screenPath;

            let scanpath = createCanvas("scanpath_canvas", canvasWidth, canvasHeight);

            if (timeInterval == 0 ) {
            if (isGenerateScanpath) { 
              await GenerateScanpath(scanpath, gazeData);
              scanpath.style.position = "absolute"
              scanpath.style.zIndex   = 100;
              containerDiv.appendChild(scanpath);
            }
            
            if (isGenerateHeatmap) { 
              await GenerateHeatmap(containerDivId, gazeData, canvasWidth, canvasHeight);
              let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
              heatmap.style.zIndex   = 200;
            }

            containerDiv.appendChild(canvas);
            ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);

            } else {
              let step = timeInterval * 1000;
              startingTime = gazeData[1][2];
              if (isGenerateScanpath) { 
                await GenerateScanpathStep(scanpath, gazeData, startingTime, step).then(scanpath.style.position = "absolute");
                scanpath.style.position = "absolute"
                scanpath.style.zIndex   = 100;
                containerDiv.appendChild(scanpath);
              }
              if (isGenerateHeatmap) {
              GenerateHeatmapStep(containerDivId, gazeData, startingTime, step, canvasWidth, canvasHeight) ;
              let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
              heatmap.style.zIndex   = 200;
              }
              containerDiv.appendChild(canvas);
              ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);
            }
          });      
        },

        nextStep: async (gazeData, startingTime, timeInterval) => {
          step = timeInterval * 1000
          let scanpath = document.getElementById("scanpath_canvas");
          startingTime = await GenerateScanpathStep(scanpath, gazeData, startingTime, step);
          scanpath.style.position = "absolute"
          scanpath.style.zIndex   = 100;

          let containerDiv = document.getElementById(containerDivId);
          let canvas = document.createElement('canvas');
          canvas.id = "GazeLayer";
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          canvas.style.zIndex = 5;
          canvas.style.position = "absolute";
          canvas.style.border = "1px solid";

          let context = canvas.getContext('2d');
          let image = new Image();
          image.onload = await function () {
            context.drawImage(image, 0, 0);
          };
          image.src = screenPath;

          if (timeInterval == 0) {
            await GenerateScanpath(scanpath, gazeData);
            scanpath.style.position = "absolute"
            scanpath.style.zIndex = 100;

            GenerateHeatmap(containerDivId, gazeData, canvasWidth, canvasHeight);
            containerDiv.appendChild(scanpath);
            containerDiv.appendChild(canvas);

            let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
            heatmap.style.zIndex = 200;
            ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);

          } else {
            let step = timeInterval * 1000;
            startingTime = gazeData[1][2];
            GenerateScanpathStep(scanpath, gazeData, startingTime, step);
            GenerateHeatmapStep(containerDiv, gazeData, startingTime, step, canvasWidth, canvasHeight);
            scanpath.style.position = "absolute"
            scanpath.style.zIndex = 100;
            containerDiv.appendChild(scanpath);
            containerDiv.appendChild(canvas);
            let heatmap = document.getElementsByClassName("heatmap-canvas")[0];
            heatmap.style.zIndex = 200;
            ipcRenderer.send('resize-window', canvasWidth, canvasHeight + 500);
          }
        }
  }
)


