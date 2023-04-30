import app from "./app.js";
import http from "http";
import wakeDyno from "woke-dyno";
import chatRooms from "./ChatRooms.js";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const WAKE_SERVER_INTERVAL = 1000 * 60 * 14; // 14 minutes
const ACTIVATE_BOT = process.env.ACTIVATE_BOT === "true" ? true : false;
const BOT_ENABLED_HOSTNAMES =
  (process.env.BOT_ENABLED_HOSTNAMES &&
    JSON.parse(process.env.BOT_ENABLED_HOSTNAMES)) ??
  [];
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  const { origin } = req.headers;
  const heartbeat = () => {
    ws.isAlive = true;
  };

  try {
    const [_, encodedNickname] = req.url.split("?nickname=");
    const nickname =
      encodedNickname && decodeURIComponent(encodedNickname).trim();
    const userId = chatRooms.addConnection(origin, ws, nickname);
    const name = nickname ?? userId;
    console.log(
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
    console.log(`[${new Date().toISOString()}] sending join message about ${name} (${userId}): ${JSON.stringify(joinMessageObj)}`);
    chatRooms.broadcast(origin, joinMessageObj);

    const hostname = origin
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
      .split(/[\/:]/)[0];
    const botIsActive =
      ACTIVATE_BOT && BOT_ENABLED_HOSTNAMES.includes(hostname);

    // send list of users in room to new connection
    const userListMessageObj = {
      user: "server",
      message: `Users in room: ${chatRooms.getNicknames(origin).join(", ")}${
        botIsActive ? `, ${chatRooms.chatbot.name} (bot)` : ""
      }`,
      timestamp: Date.now(),
    };
    console.log(`[${new Date().toISOString()}] sending userlist message to ${name} (${userId}): ${JSON.stringify(userListMessageObj)}`);
    ws.send(
      JSON.stringify(userListMessageObj)
    );

    // send greeting from chatbot
    if (botIsActive) {
      const botGreetingMessageObj = {
        user: `${chatRooms.chatbot.name} (bot)`,
        message: chatRooms.chatbot.greeting,
        timestamp: Date.now(),
      };
      console.log(`[${new Date().toISOString()}] sending bot greeting message to ${name} (${userId}): ${JSON.stringify(botGreetingMessageObj)}`);
      ws.send(
        JSON.stringify(botGreetingMessageObj)
      );
    }

    // websocket event listeners
    ws.on("error", (error) => {
      console.error("error:", error);
    });

    ws.on("message", async (arrayBufData) => {
      const message = String.fromCharCode.apply(
        null,
        new Uint16Array(arrayBufData)
      );
      console.log(
        `[${new Date().toISOString()}] incoming message from ${name} (${userId}): ${message}`
      );
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
        console.log(
          `[${new Date().toISOString()}] sending bot response to ${name} (${userId}): ${JSON.stringify(
            botResponseObj
          )}`
        );
        ws.send(JSON.stringify(botResponseObj));
      } else {
        // send message to all connections in room
        const userMessageObj = {
          user: name,
          message,
          timestamp: Date.now(),
        };
        console.log(
          `[${new Date().toISOString()}] sending message to room from ${name} (${userId}) to chatroom: ${JSON.stringify(
            userMessageObj
          )}`
        );
        chatRooms.broadcast(origin, userMessageObj);
      }
    });

    ws.on("close", () => {
      console.log(
        `[${new Date().toISOString()}] connection from ${origin}, for ${name} closed`
      );
      chatRooms.removeConnection(origin, userId);
      chatRooms.broadcast(
        origin,
        JSON.stringify({
          user: "server",
          message: `${name} left`,
          timestamp: Date.now(),
        })
      );
    });

    ws.on("pong", heartbeat);
  } catch (error) {
    console.error(error);
    ws.send(
      JSON.stringify({
        user: "server",
        message: error.message,
        timestamp: Date.now(),
      })
    );
    ws.close();
  }
});

// ping clients every 30 seconds to check if they are still alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[${new Date().toISOString()}] terminating connection`);
      return ws.terminate();
    }
    ws.isAlive = false;
    console.log(`[${new Date().toISOString()}] pinging client...`);
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

httpServer.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
  const offset = 4; // NY
  const getOffsetHours = (hours) =>
    hours + offset > 24 ? 24 - (hours + offset) : hours + offset;
  const napStartHour = getOffsetHours(22);
  const napEndHour = getOffsetHours(7);
  wakeDyno({
    url: `http://localhost:${PORT}`,
    interval: WAKE_SERVER_INTERVAL,
    startNap: [napStartHour, 0, 0, 0],
    endNap: [napEndHour, 0, 0, 0],
  }).start();
});
