import "dotenv/config";
import { Configuration, OpenAIApi } from "openai";
import opError from "./error.js";

const BOT_INSTRUCTIONS = process.env.BOT_INSTRUCTIONS;
const PUBLIC_CHATBOT_ENABLED = process.env.PUBLIC_CHATBOT_ENABLED === "true" ? true : false;
// 85% of the max token limit, to leave room for the bot's response
const TOKEN_LIMIT = Math.floor(Math.round(4096 * 0.85));
// used as key in ChatBot.messages[hostname], to store messages for the public chatbot (the one that responds to everyone in the room)
const PUBLIC_CHATROOM_ID = "chatroom";

class ChatBotRequest {
  cancelled = false;
  pending = true;
  constructor({ messages, openai, tokenLimit, model }) {
    this.messages = messages;
    this.openai = openai;
    this.model = model ?? "gpt-3.5-turbo-0301";
    this.TOKEN_LIMIT = tokenLimit ?? TOKEN_LIMIT;
    // trim the messages array to the token limit
    while (ChatBotRequest.tokenEstimate(this.messages) > this.TOKEN_LIMIT) {
      // Remove the second and third messages from the array, which are the oldest user message and the oldest bot response
      if (this.messages.length < 3) {
        throw opError("invalid_message", "message too long");
      }
      console.log("Removing earlier messages to fit token limit...");
      this.messages.splice(1, 2);
    }
  }
  static tokenEstimate(messages) {
    const textContent = messages
      .map((message) => `${message.role}: ${message.content}`)
      .join(" ");
    const wordCount = textContent.split(/[\s,.-]/).length;
    return Math.ceil(wordCount * 1.5);
  }
  cancel() {
    this.cancelled = true;
  }
  async getCompletion(messages) {
    try {
      console.log("Getting completion from OpenAI API...");
      const estimatedPromptTokens = ChatBotRequest.tokenEstimate(messages);
      let difference = this.TOKEN_LIMIT - estimatedPromptTokens;
      difference = difference < 0 ? this.TOKEN_LIMIT + difference : difference;
      performance.mark("start");
      const response = await this.openai.createChatCompletion({
        model: this.model,
        messages,
        max_tokens: difference,
        temperature: this.temperature,
      });
      console.log("\nGPT model used:", response?.data?.model);
      console.log("Total tokens:", response?.data?.usage?.total_tokens);
      return {
        data:
          response?.data?.choices &&
          response.data.choices?.[0]?.message?.content,
        status: "success",
      };
    } catch (error) {
      // do not return error to the user
      console.log("Error getting completion from OpenAI API:");
      console.error(error.response?.data?.error ?? error);
      if (error.response?.data?.error?.type === "server_error") {
        return {
          data: `My apologies, but I can't talk right now. Please come back later.`,
          status: "error",
        };
      }
    } finally {
      performance.mark("end");
      const measurement = performance.measure(
        "createCompletion",
        "start",
        "end"
      );
      console.log(
        "Time to run: ",
        parseFloat((measurement.duration / 1000).toFixed(2)),
        "s"
      );
    }
  }
}

class ChatBot {
  DEFAULT_POLICED_CATEGORIES = [
    "hate",
    "hate/threatening",
    // "self-harm",
    // "sexual",
    "sexual/minors",
    // "violence",
    // "violence/graphic",
  ];
  temperature = 0.95;
  model = "gpt-3.5-turbo-0301";
  cancelled = false;
  pendingRequestMessage = `Please wait while I finish responding to your previous message. If you don't want to wait, type "cancel" to cancel your previous message.`;
  constructor(name, wakeword = name) {
    this.conversations = {};
    this.pendingRequests = {};
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(this.configuration);
    this.name = name;
    this.wakeword = wakeword;
    this.greeting = `Welcome, my name is ${this.name} and I am a chatbot. \n${PUBLIC_CHATBOT_ENABLED ? `To speak to me in the public chat room, send a public message that contains my wake-word, "${this.wakeword}". I will respond to you in the public chat as soon as I can. To continue our public conversation, each message you send must contain the wake-word. \nAlternatively, you` : `You`} may speak to me in private and I will maintain a private history of our conversation${PUBLIC_CHATBOT_ENABLED ? ` that is separate from the public conversation` : ""}. If you send me a private message, only you will be able to see my response.`;
  }

  getSystemPrompt(hostname, userHandle, isPublic) {
    return {
      role: "system",
      content: `The following is a conversation between an AI assistant named ${
        this.name
      } and ${
        isPublic
          ? `the participants of a chat room. The user who is speaking is listed in parentheses`
          : `a user. The user's handle is ${userHandle}`
      }, and the assistant addresses the user by their handle. ${this.getBotInstructions(
        hostname
      )}`,
    };
  }

  getBotInstructions(hostname) {
    const defaultInstructions = `The assistant is helpful, creative, clever, and very friendly.`;
    const baseInstructions = BOT_INSTRUCTIONS ?? defaultInstructions;
    return `${baseInstructions} \nThe assistant lives in a chatroom on the website ${hostname}.`;
  }

  // getModeration returns a promise that resolves to the response from the OpenAI API createModeration endpoint
  async getModeration(input) {
    const response = await this.openai.createModeration({ input });
    const results = response?.data?.results?.[0];
    return results;
  }

  // failsModeration returns the category of violation (a string) if the input fails moderation, or false if it passes
  async failsModeration(
    input,
    policedCategories = this.DEFAULT_POLICED_CATEGORIES
  ) {
    const { categories } = await this.getModeration(input);
    for (const category in categories) {
      const isInViolation =
        categories[category] && policedCategories.includes(category);
      if (isInViolation) {
        return category;
      }
    }
    return false;
  }

  userHasPendingUncancelledRequest(hostname, userId) {
    const pendingRequests = this.pendingRequests[hostname]?.[userId];
    if (!pendingRequests || !pendingRequests.length) {
      return false;
    }
    return pendingRequests.some((request) => !request.cancelled);
  }

  async converse({
    message: userInput,
    hostname,
    userId,
    userHandle,
    isPublic = false,
  }) {
    const userOrPublicId = isPublic ? PUBLIC_CHATROOM_ID : userId;
    if (this.userHasPendingUncancelledRequest(hostname, userId)) {
      return this.pendingRequestMessage;
    }
    let request;
    try {
      const contentViolation = await this.failsModeration(userInput);
      if (contentViolation) {
        return `Sorry, your message was flagged as violating content policies in the category "${contentViolation}". Please reformulate and try again.`;
      }
      if (!this.conversations[hostname]) {
        this.conversations[hostname] = {};
      }
      const systemPrompt = this.getSystemPrompt(hostname, userHandle, isPublic);
      const previousConversation = this.conversations[hostname][
        userOrPublicId
      ] || [systemPrompt];
      const newMessage = {
        role: "user",
        content: isPublic ? `(${userHandle}) ${userInput}` : userInput,
      };
      const messages = [...previousConversation, newMessage];
      request = new ChatBotRequest({
        messages,
        hostname,
        openai: this.openai,
      });
      this.addToPendingRequests(hostname, userId, request);
      const completion = await request.getCompletion(messages);
      if (request.cancelled) {
        return null;
      }
      if (completion?.status === "success") {
        messages.push({
          role: "assistant",
          content: completion.data,
        });
        this.conversations[hostname][userOrPublicId] = messages;
      }
      return completion.data;
    } catch (error) {
      console.log("Error in ChatBot.converse():");
      console.error(error);
      return error?.name === "invalid_message"
        ? `Error: ${error.message}`
        : `Sorry, I'm having trouble understanding you. Please try again.`;
    } finally {
      this.removeFromPendingRequests(hostname, userId, request);
    }
  }

  addToPendingRequests(hostname, userId, request) {
    if (!this.pendingRequests[hostname]) {
      this.pendingRequests[hostname] = {};
    }
    if (this.pendingRequests[hostname][userId]) {
      this.pendingRequests[hostname][userId].push(request);
    } else {
      this.pendingRequests[hostname][userId] = [request];
    }
  }

  removeFromPendingRequests(hostname, userId, request) {
    const pendingRequests = this.pendingRequests[hostname]?.[userId];
    if (pendingRequests) {
      const index = pendingRequests.indexOf(request);
      if (index > -1) {
        pendingRequests.splice(index, 1);
      }
    }
  }

  cancelPending(hostname, userId) {
    const pendingRequest = this.pendingRequests[hostname]?.[userId]?.shift();
    if (pendingRequest) {
      pendingRequest.cancel();
      return true;
    }
    return false;
  }

  removeLastMessage(hostname, userId, isPublic, userHandle) {
    let chatbotType = "private";
    if (isPublic) {
      const lastMessage = this.conversations[hostname]?.[PUBLIC_CHATROOM_ID]?.slice(-2, -1)?.[0];
      
      const lastMessageSender = lastMessage?.content?.split(")")?.[0]?.replace("(", "");
      if (lastMessageSender === userHandle) {
        chatbotType = "public";
      }
    }
    // If the last public chatbot message was sent by the user, remove the last message from the public chatbot's message history, otherwise remove the last message from the user's private chatroom
    const messages = this.conversations[hostname]?.[chatbotType === "public" ? PUBLIC_CHATROOM_ID : userId];
    if (!messages || messages.length < 2) {
      return false;
    }
    console.log(`Removing last message from user's ${chatbotType} chatbot message history`);
    messages.splice(-2, 2);
    return chatbotType;
  }

  forget(hostname, userId) {
    const messages = this.conversations[hostname]?.[userId];
    if (!messages) {
      return false;
    }
    const clearedMessages = messages.slice(0, 1);
    this.conversations[hostname][userId] = clearedMessages;
    return clearedMessages;
  }
}

export default ChatBot;
