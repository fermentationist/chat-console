import "dotenv/config";
import opError, { ENUMERATED_ERRORS } from "./error.js";
import { cLog, wakeServer } from "./helpers.js";
import {
  executeCommand,
  sendPrivateMessage,
  chatWithBot,
  broadcast,
  addConnection,
  removeConnection,
  isBotAlias,
  botIsActive,
  shouldWakeBot,
} from "./chatRoomHelpers.js";

//==========================================================================
// Websocket connection handler
//==========================================================================
const handleConnection = (ws, req) => {
  ws.isAlive = true;
  const { origin } = req.headers;
  const hostname = origin
    .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
    .split(/[\/:]/)[0];
  try {
    const heartbeat = () => (ws.isAlive = true);

    const [_, encodedHandle] = req.url.split("?handle=");
    const handle = encodedHandle && decodeURIComponent(encodedHandle).trim();

    // send message to all connections in room to notify of new connection\
    const user = addConnection(hostname, ws, handle);
    cLog(
      `[${new Date().toISOString()}] new connection from ${hostname}${
        handle ? ` with handle ${handle}` : ""
      }, assigned id ${user.id}`
    );
    const joinMessage = `${user.name} has joined the room.`;
    broadcast(hostname, joinMessage, "server");
    cLog(
      `[${new Date().toISOString()}] sending join message about ${user.name} (${
        user.id
      })`
    );
    cLog(joinMessage, "verbose");

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
          `[${new Date().toISOString()}] incoming message from ${user.name} (${
            user.id
          })`
        );
        cLog(decodedMessage, "verbose");
        // make http call to server to keep it awake
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
            if (isBotAlias(recipient)) {
              if (!botIsActive(hostname)) {
                throw opError("invalid_command", "Chatbot is not active");
              }
              // send message to private chatbot
              chatWithBot(user, remainingMessage, false);
            } else {
              // send private message to recipient
              sendPrivateMessage(user, recipient, remainingMessage);
              cLog(
                `[${new Date().toISOString()}] sending private message to ${recipient} from ${
                  user.name
                } (${user.id})`
              );
              cLog(remainingMessage, "verbose");
            }
          } else {
            // execute command
            executeCommand(command, user, hostname);
          }
        } else if (
          // check if bot is active and message contains wakeword
          shouldWakeBot(hostname, decodedMessage)
        ) {
          // send message to public chatbot
          chatWithBot(user, decodedMessage, true);
        } else {
          // send message to all connections in room
          broadcast(hostname, decodedMessage, user.name);
          cLog(
            `[${new Date().toISOString()}] sending message to room from ${
              user.name
            } (${user.id})`
          );
          cLog(decodedMessage, "verbose");
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
        `[${new Date().toISOString()}] connection to ${
          user.name
        }, from ${hostname} closed, removing from room`
      );
      removeConnection(hostname, user.id);
      cLog(
        `[${new Date().toISOString()}] sending leave message to room for ${
          user.name
        } (${user.id})`
      );
      broadcast(hostname, `${user.name} left`, "server");
    });

    ws.on("pong", () => {
      heartbeat();
      cLog(
        `[${new Date().toISOString()}] pong received from ${user.name} (${
          user.id
        })`
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
};

export default handleConnection;
