(() => {
  let nickname = localStorage.getItem("nickname") || null;
  let ws = null;
  const scriptUrl = document.currentScript.src;
  const socketServerUrl = scriptUrl.replace("chatConsole.js", "");
  const [httpProtocol, host] = socketServerUrl.split("://");

  const infoStyle = "color: darkgray; font-size: 0.85em; font-family: Monaco, monospace;";

  const customLog = function (message, style, logType = "log") {
    console[logType](`%c${message}`, style);
  };

  const logInline = (stringSegmentArray, styleArray) => {
    const stringSegments = stringSegmentArray
      .map((segment) => `%c${segment}`)
      .join("");
    console.log(stringSegments, ...styleArray);
  };

  const logUserMessage = (userName, message, timestamp) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString();
    logInline(
      [`[${time}] `, `${userName}: `, message],
      [
        infoStyle,
        "color: #32cd32; font-size: 1em; font-family: Monaco, monospace;font-style: italic;",
        "color: #32cd32; font-size: 1em; font-family: Monaco, monospace;",
      ]
    );
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
  const logInfo = (message) =>
    customLog(
      message,
      infoStyle
    );

  const logServerMessage = (message, timestamp) => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString();
    logInline([`[${time}] `, message], [
      infoStyle,
      "color: #1e7fff; font-size: 1em; font-family: Monaco, monospace;"
    ]);
  };

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
    if (!ws) {
      logError(
        `Please connect to the chat room first using the "connect" or "join" commands.`
      );
    } else {
      const message = Array.isArray(messageOrArrayWithMessage)
        ? messageOrArrayWithMessage[0]
        : messageOrArrayWithMessage;
      ws.send(message);
    }
    return variableWidthDivider();
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
