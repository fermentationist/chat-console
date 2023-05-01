import {
  logTitle,
  logSubtitle,
  logInfo,
  logError,
  logWarning,
  logHelp,
  variableWidthDivider,
  logMessage,
} from "./customConsoleLog.js";

import {
  bindCommandToGetter,
  bindFunctionToWindow,
  getCases,
} from "./utils.js";

let chatLog = [];
let nickname = localStorage.getItem("nickname") || null;
let ws = null;
const scriptUrl = import.meta.url;
const socketServerUrl = scriptUrl.replace("chatConsole.js", "");
const [httpProtocol, host] = socketServerUrl.split("://");

const wsProtocol = httpProtocol === "https" ? "wss" : "ws";

const getNewSocketConnection = () => {
  if (wsProtocol === "ws") {
    logWarning("WARNING: Websocket connection is not secure.");
  }
  const socketUrl = `${wsProtocol}://${host}${
    nickname ? `?nickname=${nickname}` : ""
  }`;
  ws && ws.close();
  ws = new WebSocket(socketUrl);
  ws.onopen = () => {
    const time = new Date().toLocaleTimeString();
    logInfo(`[${time}] websocket connected`);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const { user, message, timestamp } = data;
    chatLog.push(data);
    logMessage(user, message, timestamp);
  };

  ws.onerror = (error) => {
    logError("error:", error);
  };

  ws.onclose = () => {
    const time = new Date().toLocaleTimeString();
    logInfo(`[${time}] websocket closed`);
  };

  return variableWidthDivider();
};

const say = (messageOrArrayWithMessage) => {
  if (!ws || ws.readyState !== 1) {
    logError(
      `Not connected. Please connect to the chat room first using the "connect" or "join" commands.`
    );
  } else {
    const message = Array.isArray(messageOrArrayWithMessage)
      ? messageOrArrayWithMessage[0]
      : messageOrArrayWithMessage;
    ws.send(message);
  }
  return variableWidthDivider();
};

const users = () => {
  return say("/users");
};

const join = (nicknameOrArrayWithNickname) => {
  const name = Array.isArray(nicknameOrArrayWithNickname)
    ? nicknameOrArrayWithNickname[0]
    : nicknameOrArrayWithNickname;
  nickname = name ?? null;
  localStorage.setItem("nickname", nickname);
  nickname && logInfo(`connecting with nickname ${nickname}`);
  ws && ws.close();
  getNewSocketConnection();
  return variableWidthDivider();
};

const logout = () => {
  logInfo("disconnecting...");
  ws && ws.close();
  ws = null;
  return variableWidthDivider();
};

const showHelp = () => {
  logHelp("Available commands:");
  logHelp("  connect - connect to the chat room with previously used nickname, or anonymously if no nickname was used");
  logHelp(
    "  join `<nickname>` - connect to the chat room with a nickname (enclose in backticks)"
  );
  logHelp(
    "  say `<message>` - send a message to the chat room (enclose in backticks)"
  );
  logHelp("  users - list users in the chat room");
  logHelp("  logout - disconnect from the chat room");
  logHelp("  log - show chat log");
  logHelp("  save - save chat log to file");
  logHelp("  load - load chat log from file");
  logHelp("  clear - clear console");
  logHelp("  help - show this help message");
  return variableWidthDivider();
};

const showChatLog = () => {
  logInfo("printing chat log...");
  chatLog.forEach(({ user, message, timestamp }) => {
    logMessage(user, message, timestamp);
  });
  return variableWidthDivider();
};

const save = () => {
  logInfo("saving chat log...");
  const data = JSON.stringify(chatLog);
  const blob = new Blob([data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-log.txt";
  a.click();
  return variableWidthDivider();
};

const load = () => {
  logInfo("loading chat log...");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      const log = JSON.parse(data);
      logInfo("printing chat log...");
      log.forEach(({ user, message, timestamp }) => {
        logMessage(user, message, timestamp);
      });
    };
    reader.readAsText(file);
  };
  input.click();
  return variableWidthDivider();
};

const clear = () => {
  console.clear();
  return variableWidthDivider();
};

// bind commands to window
bindFunctionToWindow(say, [
  ...getCases("say"),
  ...getCases("send"),
  ...getCases("talk"),
  ...getCases("chat"),
  "S",
  "s",
  "_",
]);
bindFunctionToWindow(join, [
  ...getCases("join"),
  ...getCases("login"),
  ...getCases("nick"),
]);

bindCommandToGetter(getNewSocketConnection, getCases("connect"));
bindCommandToGetter(logout, [
  ...getCases("logout"),
  ...getCases("quit"),
  ...getCases("disconnect"),
  ...getCases("exit"),
]);
bindCommandToGetter(users, [...getCases("users"), ...getCases("who")]);
bindCommandToGetter(showHelp, [...getCases("help"), ...getCases("h")]);
bindCommandToGetter(showChatLog, [...getCases("log"), ...getCases("history")]);
bindCommandToGetter(save, [...getCases("save"), ...getCases("export")]);
bindCommandToGetter(load, [...getCases("load"), ...getCases("import"), ...getCases("replay")]);
bindCommandToGetter(clear, getCases("clear"));

// log title and help message
logTitle("chat-console");
logSubtitle("© 2023 Dennis Hodges");
showHelp();
