import "dotenv/config";
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === "true";
const WAKE_SERVER_URL = process.env.WAKE_SERVER_URL;

export const cLog = (message, logLevel) => {
  if (logLevel === "verbose") {
    if (VERBOSE_LOGS) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
};

export const wakeServer = () => {
  console.log("waking http server...");
  return WAKE_SERVER_URL ? fetch(WAKE_SERVER_URL).catch((err) => {
    // do nothing if fetch fails
  }) : null;
};