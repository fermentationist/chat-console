import "dotenv/config";
import app from "./app.js";
import http from "http";
import wakeDyno from "woke-dyno";
import { WebSocketServer } from "ws";
import {cLog} from "./helpers.js";
import onWebsocketConnection from "./websocketOnConnectionHandler.js";

const PORT = process.env.PORT || 8080;
const WAKE_SERVER_URL = process.env.WAKE_SERVER_URL;
const WAKE_SERVER_INTERVAL =
  (process.env.WAKE_SERVER_INTERVAL &&
    parseInt(process.env.WAKE_SERVER_INTERVAL)) ??
  1000 * 60 * 14; // 14 minutes
const WAKE_SERVER_NAP_START = process.env.WAKE_SERVER_NAP_START;
const WAKE_SERVER_NAP_END = process.env.WAKE_SERVER_NAP_END;
const SOCKET_PING_INTERVAL = 1000 * 60; // 1 minute

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

//==========================================================================
// Websocket server
//==========================================================================
wss.on("connection", onWebsocketConnection);

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
  if (WAKE_SERVER_URL) {
    const parseTimeString = (time) => {
      if (!time) {
        return false;
      }
      let [hh, mm] = time.split(":");
      hh = parseInt(hh);
      mm = parseInt(mm);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        return [hh, mm];
      }
      return false;
    };
    const wokeDynoConfig = {
      url: WAKE_SERVER_URL,
      interval: WAKE_SERVER_INTERVAL,
    };
    const startNap = parseTimeString(WAKE_SERVER_NAP_START);
    const endNap = parseTimeString(WAKE_SERVER_NAP_END);
    if (startNap && endNap) {
      // if nap times are set
      const offset = 4; // NY
      const getOffsetHours = (hours) =>
        hours + offset > 24 ? Math.abs(24 - (hours + offset)) : hours + offset;
      const [hhStart, mmStart] = startNap;
      const [hhEnd, mmEnd] = endNap;
      const napStartHour = getOffsetHours(hhStart);
      const napEndHour = getOffsetHours(hhEnd);
      wokeDynoConfig.startNap = [napStartHour, parseInt(mmStart), 0, 0];
      wokeDynoConfig.endNap = [napEndHour, parseInt(mmEnd), 0, 0];
    }
    wakeDyno(wokeDynoConfig).start();
  }
});
