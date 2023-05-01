import app from "./app.js";
import http from "http";
import wakeDyno from "woke-dyno";
import chatRooms from "./ChatRooms.js";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const WAKE_SERVER_URL = process.env.WAKE_SERVER_URL ?? `http://localhost:${PORT}`;
const WAKE_SERVER_INTERVAL =
  (process.env.WAKE_SERVER_INTERVAL &&
    parseInt(process.env.WAKE_SERVER_INTERVAL)) ??
  1000 * 60 * 14; // 14 minutes
const SOCKET_PING_INTERVAL = 1000 * 60; // 1 minute
const ACTIVATE_BOT = process.env.ACTIVATE_BOT === "true" ? true : false;
const BOT_ENABLED_HOSTNAMES =
  (process.env.BOT_ENABLED_HOSTNAMES &&
    JSON.parse(process.env.BOT_ENABLED_HOSTNAMES)) ??
  [];
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === "true" ? true : false;
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const cLog = (message, logLevel) => {
  if (logLevel === "verbose") {
    if (VERBOSE_LOGS) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
};

wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  const { origin } = req.headers;
  const heartbeat = () => (ws.isAlive = true);
  const getUserListMessageObj = (botIsActive) => ({
    user: "server",
    message: `Users in room: ${chatRooms.getNicknames(origin).join(", ")}${
      botIsActive ? `, ${chatRooms.chatbot.name} (bot)` : ""
    }`,
    timestamp: Date.now(),
  });

  try {
    const [_, encodedNickname] = req.url.split("?nickname=");
    const nickname =
      encodedNickname && decodeURIComponent(encodedNickname).trim();
    const userId = chatRooms.addConnection(origin, ws, nickname);
    const name = nickname ?? userId;
    cLog(
      `[${new Date().toISOString()}] new connection from ${origin}${
        nickname ? ` with nickname ${nickname}` : ""
      }, assigned id ${userId}`
    );
    // send message to all connections in room to notify of new connection
    const joinMessageObj = {
      user: "server",
      message: `${name} joined`,
      timestamp: Date.now(),
    };
    cLog(
      `[${new Date().toISOString()}] sending join message about ${name} (${userId})`
    );
    cLog(joinMessageObj.message, "verbose");
    chatRooms.broadcast(origin, joinMessageObj);

    const hostname = origin
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
      .split(/[\/:]/)[0];
    const botIsActive =
      ACTIVATE_BOT && BOT_ENABLED_HOSTNAMES.includes(hostname);

    // send list of users in room to new connection
    const userListMessageObj = getUserListMessageObj(botIsActive);
    cLog(
      `[${new Date().toISOString()}] sending userlist message to ${name} (${userId})`
    );
    cLog(userListMessageObj.message, "verbose");
    ws.send(JSON.stringify(userListMessageObj));

    if (botIsActive) {
      // send greeting from chatbot
      const botGreetingMessageObj = {
        user: `${chatRooms.chatbot.name} (bot)`,
        message: chatRooms.chatbot.greeting,
        timestamp: Date.now(),
      };
      cLog(
        `[${new Date().toISOString()}] sending bot greeting message to ${name} (${userId})`
      );
      cLog(botGreetingMessageObj.message, "verbose");
      ws.send(JSON.stringify(botGreetingMessageObj));
    }

    // add websocket event listeners
    ws.on("error", (error) => {
      console.error("error:", error);
    });

    ws.on("message", async (arrayBufData) => {
      const message = String.fromCharCode.apply(
        null,
        new Uint16Array(arrayBufData)
      );
      // check if message is a command
      if (message.startsWith("/")) {
        const command = message.slice(1);
        switch (command) {
          case "users":
            // send list of users in room
            const userListMessageObj = getUserListMessageObj(botIsActive);
            cLog(
              `[${new Date().toISOString()}] sending userlist message to ${name} (${userId})`
            );
            return ws.send(JSON.stringify(userListMessageObj));
          default:
            // send error message
            const errorMessageObj = {
              user: "server",
              message: `Command not recognized: ${command}`,
              timestamp: Date.now(),
            };
            cLog(
              `[${new Date().toISOString()}] sending error message to ${name} (${userId})`
            );
            cLog(errorMessageObj.message, "verbose");
            return ws.send(JSON.stringify(errorMessageObj));
        }
      }
      cLog(
        `[${new Date().toISOString()}] incoming message from ${name} (${userId})`
      );
      cLog(message, "verbose");
      // check if bot is active and message contains wakeword
      if (
        botIsActive &&
        message.toLowerCase().includes(chatRooms.chatbot.wakeword.toLowerCase())
      ) {
        // get response from bot
        const botResponse = await chatRooms.chatbot.converse(
          message,
          origin,
          userId
        );
        // send response from bot
        const botResponseObj = {
          user: `${chatRooms.chatbot.name} (bot)`,
          message: botResponse,
          timestamp: Date.now(),
        };
        cLog(
          `[${new Date().toISOString()}] sending bot response to ${name} (${userId})`
        );
        cLog(botResponseObj.message, "verbose");
        ws.send(JSON.stringify(botResponseObj));
      } else {
        // send message to all connections in room
        const userMessageObj = {
          user: name,
          message,
          timestamp: Date.now(),
        };
        cLog(
          `[${new Date().toISOString()}] sending message to room from ${name} (${userId})`
        );
        cLog(userMessageObj.message, "verbose");
        chatRooms.broadcast(origin, userMessageObj);
      }
    });

    ws.on("close", () => {
      cLog(
        `[${new Date().toISOString()}] connection to ${name}, from ${origin} closed, removing from room`
      );
      chatRooms.removeConnection(origin, userId);
      cLog(
        `[${new Date().toISOString()}] sending leave message to room for ${name} (${userId})`
      );
      chatRooms.broadcast(
        origin,
        JSON.stringify({
          user: "server",
          message: `${name} left`,
          timestamp: Date.now(),
        })
      );
    });

    ws.on("pong", () => {
      heartbeat();
      cLog(
        `[${new Date().toISOString()}] pong received from ${name} (${userId})`
      );
    });
  } catch (error) {
    console.error("Websocket connection error:", error);
    ws.send(
      JSON.stringify({
        user: "server",
        message: "A server error occurred",
        timestamp: Date.now(),
      })
    );
    ws.close();
  }
});

// ping clients to check if they are still alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      cLog(`[${new Date().toISOString()}] terminating connection`);
      return ws.terminate();
    }
    ws.isAlive = false;
    cLog(`[${new Date().toISOString()}] pinging client...`);
    ws.ping();
  });
}, SOCKET_PING_INTERVAL + wss.clients.size * 500);

wss.on("close", () => {
  cLog(`[${new Date().toISOString()}] closing websocket server`);
  clearInterval(interval);
});

httpServer.listen(PORT, () => {
  cLog(`server listening on port ${PORT}`);
  const offset = 4; // NY
  const getOffsetHours = (hours) => (hours + offset) > 24 ? Math.abs(24 - (hours + offset)) : hours + offset;
  const napStartHour = getOffsetHours(22);
  const napEndHour = getOffsetHours(7);
  wakeDyno({
    url: WAKE_SERVER_URL,
    interval: WAKE_SERVER_INTERVAL, 
    startNap: [napStartHour, 0, 0, 0],
    endNap: [napEndHour, 0, 0, 0]
  }).start();
});
