import {
  logTitle,
  logSubtitle,
  logInfo,
  logError,
  logWarning,
  logHelp,
  logMessage,
} from "./customConsoleLog.js";

import {
  bindCommandToGetter,
  bindFunctionToWindow,
  getCases,
  variableWidthDivider,
} from "./utils.js";

let chatLog = [];
let handle = localStorage.getItem("handle") || null;
let ws = null;
let target = null;
const scriptUrl = import.meta.url;
const socketServerUrl = scriptUrl.replace("chatConsole.js", "");
const [httpProtocol, host] = socketServerUrl.split("://");

const wsProtocol = httpProtocol === "https" ? "wss" : "ws";
const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
// ==================== UTILITY FUNCTIONS ====================
const isConnected = () => {
  if (!ws || ws.readyState !== 1) {
    logWarning(
      `Not connected. Please connect to the chat room first using the "connect" or "join" commands.`
    );
    return false;
  }
  return true;
};

// ==================== COMMANDS ====================
const getNewSocketConnection = () => {
  if (wsProtocol === "ws") {
    logWarning("WARNING: Websocket connection is not secure.");
  }
  const socketUrl = `${wsProtocol}://${host}${
    handle ? `?handle=${handle}` : ""
  }`;
  ws && ws.close();
  ws = new WebSocket(socketUrl);
  ws.onopen = () => {
    const time = new Date().toLocaleTimeString();
    logInfo(`[${time}] websocket connected`);
  };

  ws.onmessage = (event) => {
    const { user, message, timestamp } = JSON.parse(event.data);
    const decodedMessage = decodeURIComponent(message);
    chatLog.push({ user, message: decodedMessage, timestamp });
    logMessage(user, decodedMessage, timestamp);
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

const join = (handleOrArrayWithHandle) => {
  const name = Array.isArray(handleOrArrayWithHandle)
    ? handleOrArrayWithHandle[0]
    : handleOrArrayWithHandle;
  handle = name ?? null;
  localStorage.setItem("handle", handle);
  handle && logInfo(`connecting with handle ${handle}`);
  ws && ws.close();
  getNewSocketConnection();
  return variableWidthDivider();
};

const say = (messageOrArrayWithMessage) => {
  if (!isConnected()) {
    return;
  }
  const message = Array.isArray(messageOrArrayWithMessage)
    ? messageOrArrayWithMessage[0]
    : messageOrArrayWithMessage;
  // using encodeURIComponent to allow for special characters
  ws.send(encodeURIComponent(message));
  return variableWidthDivider();
};

const setTarget = (targetOrArrayWithTarget) => {
  const newTarget = Array.isArray(targetOrArrayWithTarget)
    ? targetOrArrayWithTarget[0]
    : targetOrArrayWithTarget;
  target = newTarget ?? null;
  target &&
    logInfo(
      `Private message recipient set to "${target}". Use the "pm" command to send a private message.`
    );
  return variableWidthDivider();
};

const pm = (messageOrArrayWithMessage) => {
  if (!isConnected()) {
    return variableWidthDivider();
  }
  if (!target) {
    logWarning(
      `No recipient specified. Please specify a recipient using the "to" command.`
    );
    return variableWidthDivider();
  }
  const message = Array.isArray(messageOrArrayWithMessage)
    ? messageOrArrayWithMessage[0]
    : messageOrArrayWithMessage;
  // using encodeURIComponent to allow for special characters
  ws.send(encodeURIComponent(`/{${target}}/${message}`));
  return variableWidthDivider();
};

const bot = (messageOrArrayWithMessage) => {
  if (!isConnected()) {
    return;
  }
  const message = Array.isArray(messageOrArrayWithMessage)
    ? messageOrArrayWithMessage[0]
    : messageOrArrayWithMessage;
  // using encodeURIComponent to allow for special characters
  ws.send(encodeURIComponent(`/{chatbot}/${message}`));
  return variableWidthDivider();
};

const users = () => {
  return say("/users");
};

const undo = () => {
  return say("/undo");
};

const cancel = () => {
  return say("/cancel");
};

const forget = () => {
  return say("/forget");
};

const logout = () => {
  logInfo("disconnecting...");
  ws && ws.close();
  ws = null;
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
  if (isFirefox) {
    logError(
      "Firefox does not support loading chat logs. Please try a different browser."
    );
    return variableWidthDivider();
  }
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

const showChatLog = () => {
  logInfo("printing chat log...");
  chatLog.forEach(({ user, message, timestamp }) => {
    logMessage(user, message, timestamp);
  });
  return variableWidthDivider();
};

const showHelp = () => {
  logHelp("Available commands:");
  logHelp(
    "  connect - connect to the chat room with previously used handle, or anonymously if no handle was used"
  );
  logHelp(
    "  join `<handle>` - connect to the chat room with a handle, or change handle (enclose in backticks)"
  );
  logHelp(
    "  say `<message>` - send a message to the chat room (enclose in backticks)"
  );
  logHelp(
    "  bot `<message>` - send a message to the chatbot (enclose in backticks)"
  );
  logHelp(
    "  to `<handle>` - set recipient for private messages (enclose in backticks)"
  );
  logHelp(
    "  pm `<message>` - send a private message to the recipient (enclose in backticks)"
  );
  logHelp("  users - list users in the chat room");
  logHelp("  logout - disconnect from the chat room");
  logHelp("  cancel - cancel pending request to chatbot");
  logHelp(
    "  undo - remove last message and response from chatbot conversation (if any)"
  );
  logHelp(
    "  forget - remove all messages and responses from chatbot conversation"
  );
  logHelp("  log - show chat log");
  logHelp("  clear - clear console");
  logHelp("  save - save chat log to file");
  logHelp("  load - load chat log from file");
  logHelp("  help - show this help message");
  return variableWidthDivider();
};

// ==================== STARTUP ====================

// bind CLI commands to window
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
bindFunctionToWindow(pm, [
  ...getCases("pm"),
  ...getCases("dm"),
  ...getCases("whisper"),
]);
bindFunctionToWindow(setTarget, [...getCases("target"), ...getCases("to")]);
bindFunctionToWindow(bot, [...getCases("bot"), ...getCases("chatbot")]);

bindCommandToGetter(getNewSocketConnection, getCases("connect"));
bindCommandToGetter(logout, [
  ...getCases("logout"),
  ...getCases("quit"),
  ...getCases("disconnect"),
  ...getCases("exit"),
]);
bindCommandToGetter(users, [...getCases("users"), ...getCases("who")]);
bindCommandToGetter(showHelp, [...getCases("help"), "H", "h"]);
bindCommandToGetter(showChatLog, [...getCases("log"), ...getCases("chatLog")]);
bindCommandToGetter(save, [...getCases("save"), ...getCases("export")]);
bindCommandToGetter(load, [
  ...getCases("load"),
  ...getCases("import"),
  ...getCases("replay"),
]);
bindCommandToGetter(clear, getCases("clear"));
bindCommandToGetter(undo, [...getCases("unsay"), ...getCases("undo")]);
bindCommandToGetter(cancel, getCases("cancel"));
bindCommandToGetter(forget, getCases("forget"));

// log title and help message
logTitle("chat-console");
logSubtitle("© 2023 Dennis Hodges");
logInfo(
  `Type "help" for a list of commands, or "connect" to connect immediately.`
);
