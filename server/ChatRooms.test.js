import {jest} from "@jest/globals";
import chatRooms from "./ChatRooms.js";
import ChatBot from "./ChatBot.js";
import ConnectedUser from "./ConnectedUser.js";

describe("ChatRooms", () => {
  const hostname = "hostname";
  const userHandle = "userHandle";
  const userHandle2 = "userHandle2";
  const userHandle3 = "userHandle3";
  const FakeWebsocketConnection = function (){
    this.messages = [];
    this.send = jest.fn((message) => {
      this.messages.push(message);
    });
    this.clear = () => this.messages = [];
  };
  const fakeConnection = new FakeWebsocketConnection();
  const fakeConnection2 = new FakeWebsocketConnection();
  const fakeConnection3 = new FakeWebsocketConnection();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("create a chatbot if chatRooms.CHATBOT_ENABLED", () => {
      if (chatRooms.CHATBOT_ENABLED) {
        expect(chatRooms.chatbot).toBeInstanceOf(ChatBot);
      } else {
        expect(chatRooms.chatbot).toBeNull();
      }
    });
  });

  describe("addConnection", () => {
    it("should add a connection to the connections array", () => {
      chatRooms.addConnection(hostname, fakeConnection, userHandle);
      const connection = chatRooms.connections[hostname][0];
      expect(connection).toBeInstanceOf(ConnectedUser);
      expect(connection.hostname).toEqual(hostname);
      expect(connection.connection).toEqual(fakeConnection);
      expect(connection.name).toEqual(userHandle);
      expect(typeof connection.id).toEqual("string");
    });

    it("should throw an error if the handle is already in use", () => {
      try {
        chatRooms.addConnection(hostname, fakeConnection, userHandle);
      } catch (error) {
        expect(error.name).toEqual("invalid_handle");
      }
    });

    it("should throw an error if the handle is a reserved name", () => {
      for (const name of chatRooms.RESERVED_NAMES) {
        let error;
        try {
          chatRooms.addConnection(hostname, fakeConnection, name);
        } catch (err) {
          error = err;
        } finally {
          expect(error.name).toEqual("invalid_handle");
        }
      }
    });
  });

  describe("sendPrivateMessage", () => {
    it("should send a private message to a user", () => {
      const message = "message";
      const sender = "sender";
      const recipient = userHandle;
      chatRooms.sendPrivateMessage({ hostname, recipient, sender, message });
      expect(fakeConnection.send).toHaveBeenCalledTimes(1);
      expect(fakeConnection.messages.length).toEqual(1);
      expect(fakeConnection.messages[0]).toContain(sender);
      expect(fakeConnection.messages[0]).toContain(message);
      fakeConnection.clear(); // cleanup
    });
  });

  describe("broadcast", () => {
    it("should send a message to all users in a room", () => {
      chatRooms.addConnection(hostname, fakeConnection2, userHandle2);
      chatRooms.addConnection(hostname, fakeConnection3, userHandle3);
      const message = "message";
      const user = "sender";
      const timestamp = Date.now();
      chatRooms.broadcast(hostname, { message, user, timestamp });
      for (const userConnection of chatRooms.connections[hostname]) {
        expect(userConnection.connection.send).toHaveBeenCalledTimes(1);
        expect(userConnection.connection.messages.length).toEqual(1);
        expect(userConnection.connection.messages[0]).toContain(user);
        expect(userConnection.connection.messages[0]).toContain(message);
        expect(userConnection.connection.messages[0]).toContain(String(timestamp));
      }
    });
  });

  describe("getHandles", () => {
    it("should return an array of handles", () => {
      const handles = chatRooms.getHandles(hostname); 
      expect(handles).toEqual([userHandle, userHandle2, userHandle3]);
    });
  });

  describe("removeConnection", () => {
    it("should remove a connection from the connections array", () => {
      for (const connection of chatRooms.connections[hostname]) {
        chatRooms.removeConnection(hostname, connection.id);
      }
      expect(chatRooms.connections[hostname]).toEqual([]);
    });
  });
});