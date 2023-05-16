import { jest } from "@jest/globals";
import ChatBot from "./ChatBot.js";

describe("ChatBot", () => {
  let chatbot, requestToCancel, conversationsBefore;
  const completionContent = "completion";
  const hostname = "hostname";
  const userHandle = "userHandle";
  const userId = "userId";
  const message = "message";
  const converseOptions = {
    message,
    hostname,
    userId,
    userHandle,
    isPublic: false,
  };
  const createChatCompletionMockWithDelay =
    (delay = 0) =>
    () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            data: {
              choices: [
                {
                  message: {
                    content: completionContent,
                  },
                },
              ],
            },
          });
        }, delay);
      });
    };
  // afterEach(() => {
  //   jest.clearAllMocks();
  // });
  describe("constructor", () => {
    it("should set name and wakeword", () => {
      const name = "name";
      const wakeword = "wakeword";
      chatbot = new ChatBot(name, wakeword);
      expect(chatbot.name).toEqual(name);
      expect(chatbot.wakeword).toEqual(wakeword);
    });
  });

  describe("getSystemPrompt", () => {
    it("should return an object with a role and content", () => {
      const prompt = chatbot.getSystemPrompt(hostname, userHandle, true);
      expect(prompt).toHaveProperty("role");
      expect(prompt).toHaveProperty("content");
      expect(prompt.role).toEqual("system");
      expect(typeof prompt.content).toEqual("string");
    });
  });

  describe("getBotInstructions", () => {
    it("should return a string", () => {
      const instructions = chatbot.getBotInstructions();
      expect(typeof instructions).toEqual("string");
    });
  });

  describe("getModeration", () => {
    it("should return a moderation object", async () => {
      let failMod = false;
      const createModerationMock = jest.fn(() => {
        return {
          data: {
            results: [
              {
                flagged: failMod,
                categories: {
                  sexual: failMod,
                  hate: false,
                  violence: false,
                  "self-harm": false,
                  "sexual/minors": false,
                  "hate/threatening": false,
                  "violence/graphic": false,
                },
                category_scores: {
                  sexual: failMod
                    ? 0.8142989277839661
                    : 0.0000032604839361738414,
                  hate: 5.585471285485255e-8,
                  violence: 1.1472419458868899e-7,
                  "self-harm": 1.065993994464609e-11,
                  "sexual/minors": 1.7428973819733073e-9,
                  "hate/threatening": 8.059059062454077e-13,
                  "violence/graphic": 3.847795693179279e-10,
                },
              },
            ],
          },
        };
      });
      const createModeration = jest
        .spyOn(chatbot.openai, "createModeration")
        .mockImplementation(createModerationMock);
      const moderation = await chatbot.getModeration(message);
      expect(moderation).toHaveProperty("categories");
      expect(moderation).toHaveProperty("category_scores");
      expect(moderation).toHaveProperty("flagged");
      expect(moderation.flagged).toEqual(failMod);
      expect(moderation.categories.sexual).toEqual(failMod);
      failMod = true;
      const moderation2 = await chatbot.getModeration(message);
      expect(moderation2.flagged).toEqual(failMod);
      expect(moderation2.categories.sexual).toEqual(failMod);
      expect(createModeration).toHaveBeenCalledTimes(2);
    });
  });

  describe("failsModeration", () => {
    it("should return the type of violation if message contains banned content, and false otherwise", async () => {
      const getModeration = jest.spyOn(chatbot, "getModeration");
      const bannedWords = ["sexual"];
      const bannedResult = await chatbot.failsModeration(message, bannedWords);
      expect(bannedResult).toEqual("sexual");
      const allowedResult = await chatbot.failsModeration(message, []);
      expect(allowedResult).toEqual(false);
      expect(getModeration).toHaveBeenCalledTimes(2);
      getModeration.mockRestore();
    });
  });

  describe("converse", () => {
    it("should return a string", async () => {
      const createChatCompletion = jest
        .spyOn(chatbot.openai, "createChatCompletion")
        .mockImplementation(createChatCompletionMockWithDelay(0));
      const getModeration = jest.spyOn(chatbot, "getModeration");

      const converstionsBefore = { ...chatbot.conversations }?.[hostname]?.[
        userId
      ];
      const response = await chatbot.converse(converseOptions);
      const conversationsAfter = { ...chatbot.conversations }?.[hostname]?.[
        userId
      ];
      expect(typeof response).toEqual("string");
      expect(response).toEqual(completionContent);
      expect(converstionsBefore).toEqual(void 0);
      expect(Array.isArray(conversationsAfter)).toEqual(true);
      expect(conversationsAfter.length).toEqual(3);
      expect(conversationsAfter[1]?.content).toEqual(message);
      expect(conversationsAfter[2]?.content).toEqual(completionContent);
      expect(getModeration).toHaveBeenCalledTimes(1);
      expect(createChatCompletion).toHaveBeenCalledTimes(1);
      getModeration.mockRestore();
      createChatCompletion.mockRestore();
    });

    it("should return a warning and reject message if sending a second message while a previous response is still pending", (done) => {
      const createChatCompletion = jest
        .spyOn(chatbot.openai, "createChatCompletion")
        .mockImplementation(createChatCompletionMockWithDelay(250));
      const getModeration = jest.spyOn(chatbot, "getModeration");
      const firstRequest = chatbot
        .converse(converseOptions)
        .then(() => {
          conversationsBefore = { ...chatbot.conversations }?.[hostname]?.[
            userId
          ];

          // third request - should be "rejected" with pendingRequestMessage
          return chatbot.converse(converseOptions);
        })
        .then((response) => {
          expect(response).toEqual(chatbot.pendingRequestMessage);
          expect(createChatCompletion).toHaveBeenCalledTimes(2);
          expect(getModeration).toHaveBeenCalledTimes(2);
          done();
        });
      requestToCancel = chatbot.converse(converseOptions);
      // .then((res) => {
      //   expect(res).toEqual(completionContent);
      // });
    });
  });

  describe("cancelPending", () => {
    it("should cancel pending requests", (done) => {
      // cancel pending request from previous test
      requestToCancel.then((res) => {
        expect(res).toEqual(null);
        const conversationsAfter = { ...chatbot.conversations }?.[hostname]?.[
          userId
        ];
        expect(conversationsAfter).toEqual(conversationsBefore);
        done();
      });
      const cancelled = chatbot.cancelPending(hostname, userId);
      expect(cancelled).toEqual(true);
    });
  });

  describe("removeLastMessage", () => {
    it("should remove the last message from the private conversation", async () => {
      const response = await chatbot.converse(converseOptions);
      const conversationsAfter = { ...chatbot.conversations }?.[hostname]?.[
        userId
      ];
      expect(conversationsAfter.length).toEqual(conversationsBefore.length + 2);
      const type = chatbot.removeLastMessage(
        hostname,
        userId,
        false,
        userHandle
      );
      expect(type).toEqual("private");
      const conversationsAfterRemove = { ...chatbot.conversations }?.[
        hostname
      ]?.[userId];
      expect(conversationsAfterRemove).toEqual(conversationsBefore);
    });
  });
});
