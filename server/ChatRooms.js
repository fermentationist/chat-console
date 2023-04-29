import ChatBot from "./ChatBot.js";

class ChatRooms {
  BOT_NAME = "Dennis";
  BOT_WAKEWORD = this.BOT_NAME;
  maxLogLength = 7;
  RESERVED_NAMES = ["server", "bot", this.BOT_NAME, this.BOT_WAKEWORD];

  constructor() {
    this.connections = {};
    this.log = {};
    this.chatbot = new ChatBot(this.BOT_NAME);
  }

  getUid() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(-4);
    return `${timestamp}-${random}`;
  }

  addConnection(origin, connection, nickname) {
    const nicknameExists = this.connections[origin]?.some(
      (connection) => connection.name.toLowerCase() === nickname.toLowerCase()
    );
    if (nicknameExists) {
      throw new Error(`nickname ${nickname} already used`);
    }
    if (
      this.RESERVED_NAMES.map((name) => name.toLowerCase()).includes(
        nickname.toLowerCase()
      )
    ) {
      throw new Error(`${nickname} is a reserved name`);
    }
    if (!this.connections[origin]) {
      this.connections[origin] = [];
    }
    const id = this.getUid();
    this.connections[origin].push({ id, connection, name: nickname ?? id });
    return id;
  }

  removeConnection(origin, userId) {
    // remove connection
    this.connections[origin] = this.connections[origin].filter(
      (connection) => connection.id !== userId
    );
  }

  saveToLog(origin, data) {
    if (!this.log[origin]) {
      this.log[origin] = [];
    }
    this.log[origin].push(data);
    if (this.log[origin].length > this.maxLogLength) {
      this.log[origin].shift();
    }
  }

  getLog(origin) {
    return this.log[origin] ?? [];
  }

  send(origin, userId, data) {
    const connection = this.connections[origin].find(
      (connection) => connection.id === userId
    );
    if (!connection) {
      throw new Error(`connection ${userId} not found`);
    }
    connection.connection.send(data);
  }

  broadcast(origin, data) {
    this.connections[origin].forEach((connection) =>
      connection.connection.send(JSON.stringify(data))
    );
    this.saveToLog(origin, data);
  }

  getNicknames(origin) {
    return this.connections[origin].map((connection) => connection.name);
  }
}

export default new ChatRooms();
