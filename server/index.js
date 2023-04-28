import app from "./app.js";
import http from "http";
import webSockets from "./WebSockets.js";
import { WebSocketServer } from "ws";
import wakeDyno from "woke-dyno";

const PORT = process.env.PORT || 8080;
const WAKE_SERVER_INTERVAL = 1000 * 60 * 14; // 14 minutes
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
    const nickname = encodedNickname && decodeURIComponent(encodedNickname).trim();
    const userId = webSockets.addConnection(origin, ws, nickname);
    const name = nickname ?? userId;
    console.log(
      `[${new Date().toISOString()}] new connection from ${origin}${
        nickname ? ` with nickname ${nickname}` : ""
      }, assigned id ${userId}`
    );

    // send message to all connections in room to notify of new connection
    webSockets.broadcast(
      origin,
      { user: "server", message: `${name} joined`, timestamp: Date.now() }
    );
    // send list of users in room to new connection
    ws.send(
      JSON.stringify({
        user: "server",
        message: `Users in room: ${webSockets.getNicknames(origin).join(", ")}`,
        timestamp: Date.now()
      })
    );

    // websocket event listeners
    ws.on("error", (error) => {
      console.error("error:", error);
    });
    ws.on("message", (arrayBufData) => {
      const decoded = String.fromCharCode.apply(
        null,
        new Uint16Array(arrayBufData)
      );
      console.log(`[${new Date().toISOString()}] ${name} (${userId}): ${decoded}`);
      webSockets.broadcast(
        origin,
        { user: name, message: decoded, timestamp: Date.now() }
      );
    });
    ws.on("close", () => {
      console.log(`[${new Date().toISOString()}] connection from ${origin}, for ${name} closed`);
      webSockets.removeConnection(origin, userId);
      webSockets.broadcast(
        origin,
        JSON.stringify({ user: "server", message: `${name} left`, timestamp: Date.now() })
      );
    });
    ws.on("pong", heartbeat);
  } catch (error) {
    console.error(error);
    ws.send(JSON.stringify({ user: "server", message: error.message, timestamp: Date.now() }));
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
  const getOffsetHours = hours => (hours + offset) > 24 ? 24 - (hours + offset) : hours + offset;
  const napStartHour = getOffsetHours(22);
  const napEndHour = getOffsetHours(7)
  wakeDyno({
    url: `http://localhost:${PORT}`,
    interval: WAKE_SERVER_INTERVAL, 
    startNap: [napStartHour, 0, 0, 0],
    endNap: [napEndHour, 0, 0, 0]
  }).start();
});
