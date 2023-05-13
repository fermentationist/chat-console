import "dotenv/config.js";
import ChatBot from "./ChatBot.js";
import ConnectedUser from "./ConnectedUser.js";
import opError from "./error.js";

class ChatRooms {
  BOT_NAME = process.env.BOT_NAME ?? "ChatBot";
  BOT_WAKEWORD = process.env.BOT_WAKEWORD ?? this.BOT_NAME;
  BOT_ALIASES = ["chatbot", "bot", this.BOT_NAME, this.BOT_WAKEWORD];
  RESERVED_NAMES = ["server", "chatroom", "room", "all", ...this.BOT_ALIASES];
  CHATBOT_ENABLED = process.env.CHATBOT_ENABLED === "true";
  BOT_ENABLED_HOSTNAMES = process.env.BOT_ENABLED_HOSTNAMES?.split(",")?.map(hostname => hostname.trim()) ?? [];
  PUBLIC_CHATBOT_ENABLED = process.env.PUBLIC_CHATBOT_ENABLED === "true";

  constructor() {
    this.connections = {};
    this.chatbot = this.CHATBOT_ENABLED ? new ChatBot(this.BOT_NAME, this.BOT_WAKEWORD) : null;
  }

  getUid() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(-4);
    return `${timestamp}-${random}`;
  }

  addConnection(hostname, connection, handle) {
    const handleExists = this.connections[hostname]?.some(
      (connection) => connection.name.toLowerCase() === handle?.toLowerCase()
    );
    if (handleExists) {
      throw opError("invalid_handle", `handle ${handle} already used`);
    }
    if (
      this.RESERVED_NAMES.map((name) => name.toLowerCase()).includes(
        handle?.toLowerCase()
      )
    ) {
      throw opError("invalid_handle", `${handle} is a reserved name`);
    }
    if (!this.connections[hostname]) {
      this.connections[hostname] = [];
    }
    const newConnection = new ConnectedUser(connection, hostname, handle);
    this.connections[hostname].push(newConnection);
    return newConnection;
  }

  removeConnection(hostname, userId) {
    // remove connection
    this.connections[hostname] = this.connections[hostname].filter(
      (connection) => connection.id !== userId
    );
  }

  sendPrivateMessage({ hostname, recipient, sender, message }) {
    const connection = this.connections[hostname].find(
      (connection) => connection.name === recipient
    );
    if (!connection) {
      throw opError(
        "invalid_recipient",
        `connection for user ${recipient} not found`
      );
    }
    connection.connection.send(
      JSON.stringify({
        user: `${sender} (private)`,
        message,
        timestamp: Date.now(),
      })
    );
  }

  broadcast(hostname, data) {
    this.connections[hostname].forEach((connection) =>
      connection.connection.send(JSON.stringify(data))
    );
  }

  getHandles(hostname) {
    return this.connections[hostname].map((connection) => connection.name);
  }

  botIsActive(hostname) {
    return this.chatbot && (this.BOT_ENABLED_HOSTNAMES.includes(hostname) || this.BOT_ENABLED_HOSTNAMES.includes("*"));
  }
}

export default new ChatRooms();
