import {logUserMessage, logTitle, logSubtitle, logInfo, logServerMessage, logError, logWarning, logHelp, variableWidthDivider} from "./customConsoleLog.js";

import { bindCommandToGetter, bindFunctionToWindow, getCases } from "./utils.js";

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
    const { user, message, timestamp } = JSON.parse(event.data);
    if (user === "server") {
      logServerMessage(message, timestamp);
    } else {
      logUserMessage(user, message, timestamp);
    }
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
  logHelp("  connect - connect to the chat room");
  logHelp(
    "  join `<nickname>` - connect to the chat room with a nickname (use backticks)"
  );
  logHelp(
    "  say `<message>` - send a message to the chat room (use backticks)"
  );
  logHelp("  logout - disconnect from the chat room");
  logHelp("  help - show this help message");
  return variableWidthDivider();
};

// bind commands to window
bindFunctionToWindow(say, [...getCases("say"), ...getCases("send"), ...getCases("talk"), ...getCases("chat"), "S", "s", "_"]);
bindFunctionToWindow(join, [...getCases("join"), ...getCases("login"), ...getCases("nick")]);

bindCommandToGetter(getNewSocketConnection, getCases("connect"));
bindCommandToGetter(logout, [...getCases("logout"), ...getCases("quit"), ...getCases("disconnect"), ...getCases("exit")]);
bindCommandToGetter(users, [...getCases("users"), ...getCases("who")]);
bindCommandToGetter(showHelp, [...getCases("help"), ...getCases("h")]);

// log title and help message
logTitle("chat-console");
logSubtitle("© 2023 Dennis Hodges");
showHelp();
