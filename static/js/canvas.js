// Setting the variable at start
let eraseMode = false;
let pos;
let cnvHeight, cnvWidth;
let bgColor;
let cnv;
let colorPicker;
let strokeWeightValue = 5;

// Setup the canvas
function setup() {

  // Setting the canvas
  cnvHeight = 2000;
  cnvWidth = 1500;
  cnv = createCanvas(cnvWidth, cnvHeight);
  cnv.parent("sketch-holder");

  // Fetching the elements
  let backgroundBtnEl = select("#canvas-bg-color");

  let clearBtnEl = select("#canvas-clear");
  let eraserBtnEl = select("#canvas-eraser");
  let saveBtnEl = select("#canvas-save");

  let clrBlackEl = select("#canvas-clr-black");
  let clrRedEl = select("#canvas-clr-red");
  let clrOrangeEl = select("#canvas-clr-orange");
  let clrBlueEl = select("#canvas-clr-blue");
  let clrPurpleEl = select("#canvas-clr-purple");
  let clrYellowGreenEl = select("#canvas-clr-yellowgreen");
  let clrYellowEl = select("#canvas-clr-yellow");
  let clrWhiteEl = select("#canvas-clr-white");

  let ageInputIdEl = select("#ageInputId");

  // Setting the background color
  bgColor = backgroundBtnEl.value();
  background(bgColor);
  
  // Setting the background color if color changed
  backgroundBtnEl.changed(() => {
    bgColor = backgroundBtnEl.value();
    background(bgColor);
  });


  // Setting the Stoke weight if weight changed
  ageInputIdEl.changed(() => {
    strokeWeightValue = ageInputIdEl.value();
  });

  // Download the canvas
  saveBtnEl.mouseClicked(() => {
    saveCanvas(cnv, "myCanvas", "jpg");
  });

  // Eraser for the canvas
  eraserBtnEl.mouseClicked(() => {
    eraseMode = !eraseMode;
    if (eraseMode) eraserBtnEl.html("Select Brush");
    else eraserBtnEl.html("Select Erase");
  });

  // Clear the canvas
  clearBtnEl.mouseClicked(() => {
    resetSketch();
    chatSocket.send(
      JSON.stringify({
        type: "canvas",
        data: {
          clear: true,
        },
      })
    );
  });

  // Setting the brush color
  colorPicker = "#000";

  clrBlackEl.mouseClicked(() => {
    colorPicker = "#000";
  });

  clrRedEl.mouseClicked(() => {
    colorPicker = "#FF0000";
  });

  clrOrangeEl.mouseClicked(() => {
    colorPicker = "#FFA500";
  });

  clrBlueEl.mouseClicked(() => {
    colorPicker = "#0000FF";
  });

  clrPurpleEl.mouseClicked(() => {
    colorPicker = "#A020F0";
  });

  clrYellowGreenEl.mouseClicked(() => {
    colorPicker = "#9ACD32";
  });

  clrYellowEl.mouseClicked(() => {
    colorPicker = "#FFFF00";
  });

  clrWhiteEl.mouseClicked(() => {
    colorPicker = "#fff";
  });
}

// Reset canvas details
function resetSketch() {
  background(bgColor);
  stroke("#000");
}

// Change window size
function windowResized() {
  let canvasDiv = document.getElementById("sketch-holder");
  cnvHeight = canvasDiv.clientHeight;
  cnvWidth = canvasDiv.clientWidth;
  // resizeCanvas(cnvWidth, cnvHeight)
  // background(bgColor)
}

// Mouse pointer inside the canvas
function inside() {
  return mouseX <= width && mouseX >= 0 && mouseY <= height && mouseY >= 0;
}

// Mouse pointer mapped values inside the canvas
function getMappedValue(dimensions, x, y) {
  let [w, h] = dimensions;
  let myX = (width * x) / w;
  let myY = (height * y) / h;
  return [myX, myY];
}

// Draw in canvas
function draw() {
  if (editorBoardEl.value == "editor") return;
  frameRate(60);
  strokeWeight(strokeWeightValue);
  if (eraseMode && inside()) {
    cursor("grab");
  } else {
    cursor(CROSS);
  }
  if (drawQueue.length != 0) {
    let data = drawQueue.shift();
    if (data["clear"]) {
      resetSketch();
      return;
    }
    let dimensions = data["dimensions"];
    let pos = data["mousePos"];
    let [mappedMouseX, mappedMouseY] = getMappedValue(
      dimensions,
      pos["mouseX"],
      pos["mouseY"]
    );
    let [mappedPMouseX, mappedPMouseY] = getMappedValue(
      dimensions,
      pos["pmouseX"],
      pos["pmouseY"]
    );
    if (data.eraseMode) {
      strokeWeight(20);
      stroke(bgColor);
    } else {
      stroke(data.color);
    }
    line(mappedMouseX, mappedMouseY, mappedPMouseX, mappedPMouseY);
  }
  if (mouseIsPressed) {
    if (!inside()) {
      return;
    }

    if (eraseMode) {
      stroke(bgColor);
    } else {
      stroke(colorPicker);
    }
    line(mouseX, mouseY, pmouseX, pmouseY);
    chatSocket.send(
      JSON.stringify({
        type: "canvas",
        data: {
          mousePos: {
            mouseX,
            mouseY,
            pmouseX,
            pmouseY,
          },
          color: colorPicker,
          eraseMode,
          dimensions: [width, height],
          clear: false,
        },
      })
    );
  }
}
