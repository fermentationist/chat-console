export default class ConnectedUser {
  constructor(websocket, hostname, name, userId = null) {
    this.hostname = hostname;
    this.connection = websocket;
    this.id = userId ?? ConnectedUser.getUid();
    this.name = name ?? this.id;
  }
  static getUid() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(-4);
    return `${timestamp}-${random}`;
  }

  send(message, senderHandle) {
    const userMessageObj = {
      user: senderHandle,
      message,
      timestamp: Date.now(),
    };
    this.connection.send(JSON.stringify(userMessageObj));
  }

}
