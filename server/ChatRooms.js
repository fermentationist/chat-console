import "dotenv/config.js";
import ChatBot from "./ChatBot.js";
import opError from "./error.js";

class ChatRooms {
  BOT_NAME = process.env.BOT_NAME ?? "ChatBot";
  BOT_WAKEWORD = process.env.BOT_WAKEWORD ?? this.BOT_NAME;
  BOT_ALIASES = ["chatbot", "bot", this.BOT_NAME, this.BOT_WAKEWORD];
  RESERVED_NAMES = ["server", "chatroom", "room", "all", ...this.BOT_ALIASES];

  constructor() {
    this.connections = {};
    this.chatbot = new ChatBot(this.BOT_NAME, this.BOT_WAKEWORD);
  }

  getUid() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(-4);
    return `${timestamp}-${random}`;
  }

  addConnection(origin, connection, handle) {
    const handleExists = this.connections[origin]?.some(
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
    if (!this.connections[origin]) {
      this.connections[origin] = [];
    }
    const id = this.getUid();
    this.connections[origin].push({ id, connection, name: handle ?? id });
    return id;
  }

  removeConnection(origin, userId) {
    // remove connection
    this.connections[origin] = this.connections[origin].filter(
      (connection) => connection.id !== userId
    );
  }

  sendPrivateMessage({ origin, recipient, sender, message }) {
    const connection = this.connections[origin].find(
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

  broadcast(origin, data) {
    this.connections[origin].forEach((connection) =>
      connection.connection.send(JSON.stringify(data))
    );
  }

  getHandles(origin) {
    return this.connections[origin].map((connection) => connection.name);
  }
}

export default new ChatRooms();
