(() => {
  let nickname = localStorage.getItem("nickname") || null;
  let ws = null;
  const scriptUrl = document.currentScript.src;
  const socketServerUrl = scriptUrl.replace("chatConsole.js", "");
  const [httpProtocol, host] = socketServerUrl.split("://");
  console.log("socketServerUrl", socketServerUrl);
  const customLog = function (message, style, logType = "log") {
    console[logType](`%c${message}`, style);
  };
  const logTitle = (message) =>
    customLog(
      message,
      "color: #F48224; font-size: 1.5em; font-family: Roboto, Monaco, monospace;"
    );
  const logSubtitle = (message) =>
    customLog(
      message,
      "color: #F48224; font-size: 1.125em; font-family: Roboto, Monaco, monospace;"
    );
  const tinyLog = (message) =>
    customLog(
      message,
      "color: darkgray; font-size: 0.75em; font-family: Monaco, monospace;"
    );
  const log = (message) =>
    customLog(
      message,
      "color: #32cd32; font-size: 1em; font-family: Monaco, monospace;"
    );

  const logServerMessage = (message) =>
    customLog(
      message,
      "color: aqua; font-size: 1em; font-family: Monaco, monospace;"
    );
  const logError = (message) =>
    customLog(
      message,
      "color: #ff0000; font-size: 1em; font-family: Monaco, monospace;",
      "error"
    );
  const logWarning = (message) =>
    customLog(
      message,
      "color: #ff0000; font-size: 1em; font-family: Monaco, monospace;"
    );

  const logHelp = (message) => {
    customLog(
      message,
      "color: darkgray; font-size: 1.125em; font-family: Courier, monospace;"
    );
  };
  const variableWidthDivider = (width = window.innerWidth) =>
    ` `.repeat(width / 8);

  const wsProtocol = httpProtocol === "https" ? "wss" : "ws";

  const getNewSocketConnection = () => {
    if (wsProtocol === "ws") {
      logWarning("WARNING: Websocket connection is not secure.");
    }
    ws = new WebSocket(
      `${wsProtocol}://${host}/${
        nickname ? `?nickname=${nickname}` : ""
      }`
    );
    ws.onopen = () => {
      tinyLog("websocket connected");
    };

    ws.onmessage = (event) => {
      const { user, message } = JSON.parse(event.data);
      if (user === "server") {
        logServerMessage(message);
      } else {
        log(`${user}: ${message}`);
      }
    };

    ws.onerror = (error) => {
      logError("error:", error);
    };

    ws.onclose = () => {
      tinyLog("websocket closed");
    };
    return variableWidthDivider();
  };

  const say = (messageOrArrayWithMessage) => {
    if (!ws) {
      getNewSocketConnection();
    }
    const message = Array.isArray(messageOrArrayWithMessage)
      ? messageOrArrayWithMessage[0]
      : messageOrArrayWithMessage;
    ws.send(message);
    return variableWidthDivider();
  };

  const join = (messageOrArrayWithMessage) => {
    const message = Array.isArray(messageOrArrayWithMessage)
      ? messageOrArrayWithMessage[0]
      : messageOrArrayWithMessage;
    nickname = message ?? null;
    localStorage.setItem("nickname", nickname);
    message && tinyLog(`connecting with nickname ${nickname}`);
    ws && ws.close();
    getNewSocketConnection();
    return variableWidthDivider();
  };

  const logout = () => {
    log("disconnecting...");
    ws && ws.close();
    return variableWidthDivider();
  };

  const showHelp = () => {
    logHelp("Available commands:");
    logHelp("  connect - connect to the chat room");
    logHelp(
      "  join `<nickname>` - join the chat room with a nickname (use backticks)"
    );
    logHelp(
      "  say `<message>` - send a message to the chat room (use backticks)"
    );
    logHelp("  logout - disconnect from the chat room");
    logHelp("  help - show this help message");
    return variableWidthDivider();
  };

  window.say = say;
  window._ = say;
  window.join = join;
  window.nick = join;
  window.login = join;
  Object.defineProperty(window, "connect", { get: getNewSocketConnection });
  Object.defineProperty(window, "disconnect", { get: logout });
  Object.defineProperty(window, "logout", { get: logout });
  Object.defineProperty(window, "quit", { get: logout });
  Object.defineProperty(window, "help", { get: showHelp });
  logTitle("chat-console");
  logSubtitle("© 2023 Dennis Hodges");
  showHelp();
})();
