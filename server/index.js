import app from "./app.js";
import http from "http";
import wakeDyno from "woke-dyno";
import chatRooms from "./ChatRooms.js";
import opError, { ENUMERATED_ERRORS } from "./error.js";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const WAKE_SERVER_URL = process.env.WAKE_SERVER_URL;
const WAKE_SERVER_INTERVAL =
  (process.env.WAKE_SERVER_INTERVAL &&
    parseInt(process.env.WAKE_SERVER_INTERVAL)) ??
  1000 * 60 * 14; // 14 minutes
const WAKE_SERVER_NAP_START = process.env.WAKE_SERVER_NAP_START;
const WAKE_SERVER_NAP_END = process.env.WAKE_SERVER_NAP_END;
const SOCKET_PING_INTERVAL = 1000 * 60; // 1 minute
const CHATBOT_ENABLED = process.env.CHATBOT_ENABLED === "true" ? true : false;
let BOT_ENABLED_HOSTNAMES;
try {
  BOT_ENABLED_HOSTNAMES =
    process.env.BOT_ENABLED_HOSTNAMES &&
    JSON.parse(process.env.BOT_ENABLED_HOSTNAMES);
  if (!Array.isArray(BOT_ENABLED_HOSTNAMES)) {
    throw new Error();
  }
} catch (err) {
  BOT_ENABLED_HOSTNAMES = [];
}
// whether `say` commands that use the bot's wakeword should be sent to public chatbot (and chatroom) as opposed to the private chatbot
const PUBLIC_CHATBOT_ENABLED =
  process.env.PUBLIC_CHATBOT_ENABLED === "true" ? true : false;
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === "true" ? true : false;

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

//==========================================================================
// Helper functions
//==========================================================================
const cLog = (message, logLevel) => {
  if (logLevel === "verbose") {
    if (VERBOSE_LOGS) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
};

const wakeServer = () => {
  console.log("waking server...");
  return fetch(WAKE_SERVER_URL).catch((err) => {
    // do nothing if fetch fails
  });
};

//==========================================================================
// Websocket server
//==========================================================================
wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  let lastBotInteractionWasPublic = false;
  const { origin } = req.headers;
  const hostname = origin
    .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
    .split(/[\/:]/)[0];
  const botIsActive =
    CHATBOT_ENABLED &&
    (BOT_ENABLED_HOSTNAMES.includes(hostname) ||
      BOT_ENABLED_HOSTNAMES.includes("*"));
  try {
    const [_, encodedHandle] = req.url.split("?handle=");
    const handle = encodedHandle && decodeURIComponent(encodedHandle).trim();
    const userId = chatRooms.addConnection(origin, ws, handle);
    const name = handle ?? userId;
    cLog(
      `[${new Date().toISOString()}] new connection from ${origin}${
        handle ? ` with handle ${handle}` : ""
      }, assigned id ${userId}`
    );

    //==========================================================================
    // MESSAGE HANDLING AND HELPER METHODS
    //==========================================================================
    const heartbeat = () => (ws.isAlive = true);
    const getUserListMessage = () => {
      return `Users in room: ${chatRooms.getHandles(origin).join(", ")}${
        botIsActive ? `, ${chatRooms.chatbot.name} (bot)` : ""
      }`;
    };
    const sendMessageToUser = (message, senderHandle) => {
      const userMessageObj = {
        user: senderHandle,
        message,
        timestamp: Date.now(),
      };
      cLog(
        `[${new Date().toISOString()}] sending message to ${name} (${userId}) from ${senderHandle}`
      );
      cLog(message, "verbose");
      ws.send(JSON.stringify(userMessageObj));
    };

    const sendBotInactiveError = (command) => {
      const message = `"${command}" command only works when a chatbot is active`;
      sendMessageToUser(message, "server");
    };

    const executeCommand = (command) => {
      // COMMANDS
      switch (command) {
        case "users":
          // send list of users in room
          return sendMessageToUser(getUserListMessage(), "server");
        case "undo":
          if (!botIsActive) {
            // send error message
            return sendBotInactiveError("undo");
          }
          // remove last message and response from bot conversation
          const typeRemoved = chatRooms.chatbot.removeLastMessage(
            origin,
            userId,
            lastBotInteractionWasPublic,
            name
          );
          const unsayResponseMessage = typeRemoved
            ? `Somehow, you manage to unsay the last thing you said to ${chatRooms.chatbot.name} in ${typeRemoved}.`
            : `${
                lastBotInteractionWasPublic
                  ? `You can't undo the last public message to ${chatRooms.chatbot.name} because it did not come from you.`
                  : `You haven't said anything privately to ${chatRooms.chatbot.name} yet.`
              }`;
          return sendMessageToUser(unsayResponseMessage, "server");
        case "cancel":
          if (!botIsActive) {
            // send error message
            return sendBotInactiveError("cancel");
          }
          // cancel pending bot completion
          const cancelled = chatRooms.chatbot.cancelPending(origin, userId);
          const cancelMessage = cancelled
            ? `Your pending request to ${chatRooms.chatbot.name} has been cancelled.`
            : `You don't have any pending requests to ${chatRooms.chatbot.name}.`;
          return sendMessageToUser(cancelMessage, "server");
        case "forget":
          if (!botIsActive) {
            // send error message
            return sendBotInactiveError("forget");
          }
          // forget all messages and responses from bot conversation
          const forgotten = chatRooms.chatbot.forget(origin, userId);
          const forgetResponseMessage = forgotten
            ? `${chatRooms.chatbot.name} forgets your private conversation.`
            : `You haven't said anything privately to ${chatRooms.chatbot.name} yet.`;
          return sendMessageToUser(forgetResponseMessage, "server");
        default:
          // send error message
          return sendMessageToUser(
            `Command not recognized: ${command}`,
            "server"
          );
      }
    };

    const sendPrivateMessage = (recipient, message) => {
      cLog(
        `[${new Date().toISOString()}] sending private message to ${recipient} from ${name} (${userId})`
      );
      cLog(message, "verbose");
      // echoing message back to user
      ws.send(
        JSON.stringify({
          user: `${name} (to ${recipient})`,
          message,
          timestamp: Date.now(),
        })
      );
      chatRooms.sendPrivateMessage({
        origin,
        recipient,
        sender: name,
        message,
      });
    };

    const broadcast = (message, senderHandle) => {
      const userMessageObj = {
        user: senderHandle,
        message,
        timestamp: Date.now(),
      };
      cLog(
        `[${new Date().toISOString()}] sending message to room from ${name} (${userId})`
      );
      cLog(userMessageObj.message, "verbose");
      chatRooms.broadcast(origin, userMessageObj);
    };

    const chatWithBot = async (message, isPublic = false) => {
      if (isPublic) {
        // send message to chat room
        broadcast(message, name);
      } else {
        // echo message back to user
        sendMessageToUser(message, `${name} (to ${chatRooms.chatbot.name})`);
      }
      // get response from bot
      const botResponse = await chatRooms.chatbot.converse({
        message,
        origin,
        userId,
        userHandle: name,
        isPublic,
      });
      // check for cancellation
      if (botResponse === null) {
        // request was cancelled, do nothing
        return;
      }
      // send response from bot
      if (isPublic) {
        // send bot response to chat room
        lastBotInteractionWasPublic = true;
        broadcast(botResponse, `${chatRooms.chatbot.name} [bot]`);
      } else {
        // send bot response to user
        lastBotInteractionWasPublic = false;
        sendMessageToUser(
          botResponse,
          `${chatRooms.chatbot.name} [bot] (private)`
        );
      }
    };

    //==========================================================================
    // END MESSAGE HANDLING METHODS
    //==========================================================================

    // send message to all connections in room to notify of new connection
    const joinMessage = `${name} joined`;
    broadcast(joinMessage, "server");
    cLog(
      `[${new Date().toISOString()}] sending join message about ${name} (${userId})`
    );
    cLog(joinMessage, "verbose");

    // send list of users in room to new connection
    sendMessageToUser(getUserListMessage(), "server");

    if (botIsActive) {
      // send greeting from chatbot
      sendMessageToUser(
        chatRooms.chatbot.greeting,
        `${chatRooms.chatbot.name} (bot)`
      );
    }

    //==========================================================================
    // WEBSOCKET EVENT LISTENERS
    //==========================================================================
    ws.on("error", (error) => {
      console.error("error:", error);
    });

    ws.on("message", async (arrayBufData) => {
      try {
        const message = String.fromCharCode.apply(
          null,
          new Uint16Array(arrayBufData)
        );
        const decodedMessage = decodeURIComponent(message);
        cLog(
          `[${new Date().toISOString()}] incoming message from ${name} (${userId})`
        );
        cLog(decodedMessage, "verbose");
        // ping server to keep it awake
        wakeServer();
        // check if message is a command or private message
        if (decodedMessage.startsWith("/")) {
          const commandMessage = decodedMessage.slice(1);
          const [command, ...remainingMessageArr] = commandMessage.split("/");
          // check if command is private message recipient
          if (command.startsWith("{") && command.endsWith("}")) {
            const remainingMessage = remainingMessageArr.join("/");
            const recipient = command.slice(1, -1);
            // check if recipient is chatbot
            if (chatRooms.BOT_ALIASES.includes(recipient.toLowerCase())) {
              if (!botIsActive) {
                throw opError("invalid_command", "Chatbot is not active");
              }
              // send message to private chatbot
              chatWithBot(remainingMessage, false);
            } else {
              // send private message to recipient
              sendPrivateMessage(recipient, remainingMessage);
            }
          } else {
            // execute command
            executeCommand(command);
          }
        } else if (
          // check if bot is active and message contains wakeword
          botIsActive &&
          PUBLIC_CHATBOT_ENABLED &&
          decodedMessage
            .toLowerCase()
            .includes(chatRooms.chatbot.wakeword.toLowerCase())
        ) {
          // send message to public chatbot
          chatWithBot(decodedMessage, true);
        } else {
          // send message to all connections in room
          broadcast(decodedMessage, name);
        }
      } catch (error) {
        console.error("Error handling message:", error);
        const message = ENUMERATED_ERRORS.includes(error.name)
          ? error.message
          : "An error occurred";
        ws.send(
          JSON.stringify({
            user: "server",
            message,
            timestamp: Date.now(),
          })
        );
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
      broadcast(`${name} left`, "server");
    });

    ws.on("pong", () => {
      heartbeat();
      cLog(
        `[${new Date().toISOString()}] pong received from ${name} (${userId})`
      );
    });
  } catch (error) {
    console.error("Websocket connection error:", error);
    const message = ENUMERATED_ERRORS.includes(error.name)
      ? error.message
      : "A server error occurred";
    ws.send(
      JSON.stringify({
        user: "server",
        message,
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
