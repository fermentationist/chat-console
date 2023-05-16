import ConnectedUser from "./ConnectedUser.js";
import {jest} from "@jest/globals";

describe("ConnectedUser", () => {
  describe("constructor", () => {
    it("should set hostname, connection, id, and name", () => {
      const hostname = "hostname";
      const connection = "connection";
      const name = "name";
      const userId = "userId";
      const connectedUser = new ConnectedUser(
        connection,
        hostname,
        name,
        userId
      );
      expect(connectedUser.hostname).toEqual(hostname);
      expect(connectedUser.connection).toEqual(connection);
      expect(connectedUser.id).toEqual(userId);
      expect(connectedUser.name).toEqual(name);
    });
    it("should set id to a random value if not provided", () => {
      const hostname = "hostname";
      const connection = "connection";
      const name = "name";
      const connectedUser = new ConnectedUser(connection, hostname, name);
      expect(connectedUser.id).not.toBeNull();
    });
    it("should set name to id if not provided", () => {
      const hostname = "hostname";
      const connection = "connection";
      const connectedUser = new ConnectedUser(connection, hostname);
      expect(connectedUser.name).toEqual(connectedUser.id);
    });
  });

  describe("getUid", () => {
    it("should return a string", () => {
      const uid = ConnectedUser.getUid();
      expect(typeof uid).toEqual("string");
    });
    it("should return a uid composed of a timestamp and random value, in base36 encoding", () => {
      const before = Date.now();
      const uid = ConnectedUser.getUid();
      const after = Date.now();
      const [timestamp, random] = uid.split("-").map((str) => parseInt(str, 36));
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
      expect(typeof random).toEqual("number");
    });
  });

  describe("send", () => {
    it("should send a message to the connection", () => {
      const connection = {
        send: jest.fn(),
      };
      const connectedUser = new ConnectedUser(connection, "hostname", "name");
      const message = "message";
      const senderHandle = "senderHandle";
      const timestamp = Date.now();
      connectedUser.send(message, senderHandle);
      expect(connection.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(connection.send.mock.calls[0][0]);
      expect(sentMessage.timestamp).toBeGreaterThanOrEqual(timestamp);
      expect(sentMessage.timestamp).toBeLessThanOrEqual(Date.now());
      expect(sentMessage.message).toEqual(message);
      expect(sentMessage.user).toEqual(senderHandle);
    });
  });
});