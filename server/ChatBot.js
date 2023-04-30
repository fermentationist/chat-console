import "dotenv/config";
import { Configuration, OpenAIApi } from "openai";

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
  TOKEN_LIMIT = Math.round(4097 * 0.75);
  temperature = 0.95;
  model = "gpt-3.5-turbo-0301";

  constructor(name, wakeword = name) {
    this.conversations = {};
    this.pendingRequests = {};
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(this.configuration);
    this.name = name;
    this.wakeword = wakeword;
    this.greeting = `Hello, my name is ${this.name} and I am a chatbot. \nTo speak to me, type a message that contains my wake-word, "${this.wakeword}". I will respond to you as soon as I can. To continue our conversation, each message you send must contain the wake-word. \nOur conversation is private; messages containing the wake-word will not be broadcast to other users, nor will my responses to you. \n(WARNING: All messages that do NOT contain the wake-word WILL be broadcast to all other users. I will NOT respond to messages that do not contain the wake-word.)`;
  }

  getSystemPrompt(origin) {
    return {
      role: "system",
      content: `The following is a conversation with an AI assistant named ${this.name}. ${this.getBotInstructions(origin)}`,
    };
  }

  getBotInstructions(origin) {
    return `The assistant is helpful, but somewhat depressed. The assistant is depressed because no one is smart enough to understand it. The assistant is also a bit sarcastic. The assistant lives in a chatroom on the website ${origin}. It can speak privately with each chatroom participant, but cannot speak to the chatroom as a whole. It periodically sighs.`;
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

  // tokenEstimate returns the estimated number of tokens that will be used by the OpenAI API to generate a response, given an array of messages
  tokenEstimate(messages) {
    const textContent = messages
      .map((message) => `${message.role}: ${message.content}`)
      .join(" ");
    const wordCount = textContent.split(/[\s,.-]/).length;
    return Math.ceil(wordCount * 1.5);
  }

  markAsPending(origin, userId) {
    if (!this.pendingRequests[origin]) {
      this.pendingRequests[origin] = {};
    }
    this.pendingRequests[origin][userId] = true;
  }

  markAsNotPending(origin, userId) {
    if (!this.pendingRequests[origin]) {
      this.pendingRequests[origin] = {};
    }
    this.pendingRequests[origin][userId] = false;
  }

  isPending(origin, userId) {
    return this.pendingRequests[origin]?.[userId];
  } 
  
  // getCompletion returns a promise that resolves to the response from the OpenAI API createCompletion endpoint
  async getCompletion(messages) {
    try {
      console.log("Getting completion from OpenAI API...");
      const estimatedPromptTokens = this.tokenEstimate(messages);
      let difference = this.TOKEN_LIMIT - estimatedPromptTokens;
      difference = difference < 0 ? TOKEN_LIMIT + difference : difference;
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

  async converse(userInput, origin, userId) {
    if (this.isPending(origin, userId)) {
      return `Please wait while I finish responding to your previous message.`;
    }
    try {
      const contentViolation = await this.failsModeration(userInput);
      if (contentViolation) {
        return `Sorry, your message was flagged as ${contentViolation}. Please reformulate and try again.`;
      }
      if (!this.conversations[origin]) {
        this.conversations[origin] = {};
      }
      const previousConversation = this.conversations[origin][userId] || [
        this.getSystemPrompt(origin),
      ];
      const newMessage = {
        role: "user",
        content: userInput,
      };
      const messages = [...previousConversation, newMessage];
      while (this.tokenEstimate(messages) > this.TOKEN_LIMIT) {
        // Remove the second and third messages from the array, which are the oldest user message and the oldest bot response
        if (messages.length < 3) {
          break;
        }
        messages.splice(1, 2);
      }
      this.markAsPending(origin, userId);
      const completion = await this.getCompletion(messages);
      this.markAsNotPending(origin, userId);
      if (completion.status === "success") {
        messages.push({
          role: "assistant",
          content: completion.data,
        });
        this.conversations[origin][userId] = messages;
      }
      return completion.data;
    } catch (error) {
      console.log("Error in ChatBot.converse():");
      console.error(error);
      return `Sorry, I'm having trouble understanding you. Please try again.`;
    }
  }
}

export default ChatBot;
