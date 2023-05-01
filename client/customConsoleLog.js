const infoStyle = "color: darkgray; font-size: 0.85em; font-family: Monaco, monospace;";
const userStyle = "color: #32cd32; font-size: 1em; font-family: Monaco, monospace; line-height: 1.75;"

export const customLog = function (message, style, logType = "log") {
  console[logType](`%c${message}`, style);
};

export const logInline = (stringSegmentArray, styleArray) => {
  const stringSegments = stringSegmentArray
    .map((segment) => `%c${segment}`)
    .join("");
  console.log(stringSegments, ...styleArray);
};

export const logMessage = (username, message, timestamp) => {
  if (username === "server") {
    logServerMessage(decodeURIComponent(message), timestamp);
  } else {
    logUserMessage(username, decodeURIComponent(message), timestamp);
  }
}

export const logUserMessage = (userName, message, timestamp) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString();
  logInline(
    [`[${time}] `, `${userName}: `, message],
    [
      infoStyle,
      userStyle + "font-style: italic;",
      userStyle,
    ]
  );
};

export const logTitle = (message) =>
  customLog(
    message,
    "color: #F48224; font-size: 1.5em; font-family: Roboto, Monaco, monospace;"
  );
export const logSubtitle = (message) =>
  customLog(
    message,
    "color: #F48224; font-size: 1.125em; font-family: Roboto, Monaco, monospace;"
  );
export const logInfo = (message) =>
  customLog(
    message,
    infoStyle
  );

export const logServerMessage = (message, timestamp) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString();
  logInline([`[${time}] `, message], [
    infoStyle,
    "color: #1e7fff; font-size: 1em; font-family: Monaco, monospace; line-height: 1.75;"
  ]);
};

export const logError = (message) =>
  customLog(
    message,
    "color: #ff0000; font-size: 1em; font-family: Monaco, monospace;",
    "error"
  );
export const logWarning = (message) =>
  customLog(
    message,
    "color: #ff0000; font-size: 1em; font-family: Monaco, monospace;"
  );

export const logHelp = (message) => {
  customLog(
    message,
    "color: darkgray; font-size: 1.125em; font-family: Courier, monospace;"
  );
};

