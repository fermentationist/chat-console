class WebSockets {
  constructor() {
    this.connections = {};
  }

  getUid() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(-4);
    return `${timestamp}-${random}`;
  }

  addConnection(origin, connection, nickname) {
    const nicknameExists = this.connections[origin]?.some(
      (connection) => connection.name === nickname
    );
    if (nicknameExists) {
      throw new Error(`nickname ${nickname} already exists`);
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

  broadcast(origin, data) {
    this.connections[origin].forEach((connection) =>
      connection.connection.send(data)
    );
  }

  getNicknames(origin) {
    return this.connections[origin].map((connection) => connection.name);
  }
}

export default new WebSockets();
