// Setting the editor at starting
var editor = ace.edit("editor");
editor.setTheme("ace/theme/xcode");
document.getElementById("editor").style.fontSize = "16px";
editor.session.setMode("ace/mode/python");
editor.session.setValue(
  "#Write your python code here \nprint('Hello world! Python')"
);

let cursorPos = null;
let lock = false;

// Sending editor data on change to consumer
editor.session.on("change", function (delta) {
  if (lock) return;
  chatSocket.send(
    JSON.stringify({
      type: "editor",
      text: delta,
      cursor: editor.selection.getCursor(),
    })
  );
});

// Selecting Editor, Canvas, Chat
const editorBoardEl = document.getElementById("editor-canvas");
const mainEditor = document.getElementById("main-editor");
const mainCanvas = document.getElementById("main-canvas");
const chatWindow = document.getElementById("chat-text");

// Toggle between editor and canvas
const toggleEditorBoard = (e) => {
  console.log("EDITOR: ", e.target.value);
  e.target.value = e.target.value == "editor" ? "canvas" : "editor";
  if (e.target.value == "editor") {
    mainEditor.style.display = "block";
    mainCanvas.style.display = "none";
    e.target.innerHTML = "canvas";
  } else {
    mainEditor.style.display = "none";
    mainCanvas.style.display = "block";
    e.target.innerHTML = "Editor";
  }
};

editorBoardEl.addEventListener("click", toggleEditorBoard);

// Change Font size
const changeFontSize = (e) => {
  const el = document.getElementById("editor");
  el.style.fontSize = `${e.value}px`;
};

// Change Theme
const changeTheme = (e) => {
  editor.setTheme(`ace/theme/${e.value}`);
};

// Change selected language and Set editor mode to selected language
const changeLanguage = (e) => {
  let val = e.value;
  console.log(val);

  if (val == "python") {
    editor.session.setValue(
      `#Write your python code here \nprint('Hello world! Python')`
    );
  } else if (val == "c") {
    editor.session.setValue(
      `//Write your C code here \n#include <stdio.h>\n\nint main() {\n    printf("Hello world! C");\n    return 0;\n}`
    );
  } else if (val == "cpp") {
    editor.session.setValue(
      `//Write your C++ code here \n#include <iostream>\n\nint main() {\n    std::cout << "Hello world! C++";\n    return 0;\n}`
    );
  } else if (val == "java") {
    editor.session.setValue(
      `//Write your Java code here \nclass TestClass {\n    public static void main(String args[]) {\n        System.out.println("Hello, World! Java");\n    }\n}`
    );
  }

  if (val == "c" || val == "cpp") val = "c_cpp";

  // Setting the editor language mode
  editor.session.setMode(`ace/mode/${val}`);
};

// Setting the localhost
const isLocalHost = () => {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
};

// Connecting to the WebSocket
const roomName = document.getElementById("room-name").textContent;
const chatSocket = new WebSocket(
  (isLocalHost() ? "ws://" : "wss://") +
    // 'ws://' +
    window.location.host +
    "/ws/editor/" +
    roomName +
    "/"
);

// For Canvas
let drawQueue = [];

// Receiving data from consumer
chatSocket.onmessage = function (e) {
  let data = JSON.parse(e.data);

  // User Joined
  if (data["type"] == "user-join-leave") {
    document.querySelector("#current-joined-peoples").innerHTML =
      data.users.length;
    document.querySelector("#joined-users").innerHTML = "";
    data.users.forEach((user) => {
      document.querySelector(
        "#joined-users"
      ).innerHTML += `<li class="list-group-item my-1 d-flex align-items-center">
        <div class="icon-user d-flex align-items-center justify-content-center">
            <i class="fa fa-user-o text-light"></i>
        </div>
        <span class="icon-user-text">${user}</span>
    </li>`;
    });
  }

  // Chat message
  else if (data["type"] == "chat") {
    if (data.username) {
      console.log(data.message);
      document.querySelector("#chat-text").innerHTML +=
        '<span class="text-info font-weight-bold">' +
        data.username +
        "</span>" +
        ": " +
        data.message +
        "<br/>";
    } else {
      document.querySelector("#chat-text").innerHTML +=
        '<span class="font-weight-bold text-success">' +
        data.message +
        "</span>" +
        "<br/>";
    }

    // auto scroll chat box
    var xH = chatWindow.scrollHeight;
    chatWindow.scrollTo(0, xH);
  }

  // Editor text
  else if (data["type"] == "editor") {
    if (userName != data.username) {
      cursorPos = editor.selection.getCursor();
      lock = true;
      if (data["sync"]) {
        editor.setValue(data["text"]);
        editor.clearSelection();
      } else if (data["text"] != null) {
        editor.getSession().getDocument().applyDeltas([data["text"]]);
      }
      lock = false;
      editor.moveCursorToPosition(cursorPos);
    }
  }

  // Canvas data
  else if (data["type"] == "canvas") {
    drawQueue.push(data["data"]);
  }

  // Output data
  else if (data["type"] == "output") {
    showOutput(data["data"]);
  }
};

console.log(chatSocket);

// Execute source code
function runCode(e) {
  const codeInputEl = document.getElementById("editor-input");
  const languageEl = document.getElementById("selected-language");

  // Fetching Data
  const sourceCode = editor.getValue();
  let codeInput = codeInputEl.value;
  let language = languageEl.value;

  switch (language) {
    case "python":
      language = "PYTHON3";
      break;
    case "c":
      language = "C";
      break;
    case "cpp":
      language = "CPP11";
      break;
    case "java":
      language = "JAVA";
      break;
    default:
      language = "PYTHON3";
  }

  let ele = document.getElementById("code-output");
  ele.classList = ["text-white"];

  // Datas to be send to post request
  const data = {
    sourceCode: sourceCode,
    language: language,
    codeInput: codeInput,
  };
  const options = {
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  };

  // Send POST request to Execute code
  axios
    .post("/run/", data, options)
    .then((res) => {
      console.log("res: ", res);
      chatSocket.send(
        JSON.stringify({
          type: "output",
          data: res,
        })
      );
    })
    .catch((err) => {
      console.log("err: ", err);
      ele.classList.add("text-danger");
      ele.innerHTML = "Unexpected error occured";
    });
}

// Display output
function showOutput(res) {
  let data = res.data;
  let ele = document.getElementById("code-output");
  let text;
  if (data.code == "0") {
    text = data.results;
  } else if (data.code == "1") {
    ele.classList.add("text-danger");
    text = data.results;
  } else if (data.code == "2") {
    ele.classList.add("text-danger");
    text = data.msg;
  } else if (data.code == "-1") {
    ele.classList.add("text-danger");
    text = data.msg;
  }
  ele.innerHTML = text;
  ele.classList = ["text-white"];
}

// Send the chat message to consumer
document.querySelector("#submit").onclick = function (e) {
  console.log("sending data");
  const messageInputDom = document.querySelector("#chat-input");
  const message = messageInputDom.value;

  chatSocket.send(
    JSON.stringify({
      type: "chat",
      message: message,
    })
  );
  messageInputDom.value = "";
};

// Send the chat data using Enter+Shiftkey
document.querySelector("#chat-input").addEventListener("keyup", (e) => {
  if (e.key == "Enter" && e.shiftKey) {
    document.querySelector("#submit").click();
  }
});

// Download code
function saveCode(e) {
  console.log("pressed");
  let code = editor.session.getValue();
  download(`solution`, code);
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// Generate Cookie
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie != "") {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) == name + "=") {
        console.log("HHHHHHH");
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Set the CANVAS to none at starting
mainCanvas.style.display = "none";
