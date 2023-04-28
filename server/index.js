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
      `new connection from ${origin}${
        nickname ? ` with nickname ${nickname}` : ""
      }, assigned id ${userId}`
    );
    webSockets.broadcast(
      origin,
      JSON.stringify({ user: "server", message: `${name} joined` })
    );
    ws.send(
      JSON.stringify({
        user: "server",
        message: `Users in room: ${webSockets.getNicknames(origin).join(", ")}`,
      })
    );

    ws.on("error", (error) => {
      console.error("error:", error);
    });
    ws.on("message", (arrayBufData) => {
      const decoded = String.fromCharCode.apply(
        null,
        new Uint16Array(arrayBufData)
      );
      console.log(`${name} (${userId}): ${decoded}`);
      webSockets.broadcast(
        origin,
        JSON.stringify({ user: name, message: decoded })
      );
    });
    ws.on("close", () => {
      console.log(`connection from ${origin}, for ${name} closed`);
      webSockets.removeConnection(origin, userId);
      webSockets.broadcast(
        origin,
        JSON.stringify({ user: "server", message: `${name} left` })
      );
    });
    ws.on("pong", heartbeat);
  } catch (error) {
    console.error(error);
    ws.send(JSON.stringify({ user: "server", message: error.message }));
    ws.close();
  }
});

// ping clients every 30 seconds to check if they are still alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log("terminating connection");
      return ws.terminate();
    }
    ws.isAlive = false;
    console.log("pinging client...");
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
