# chat-console
---

## About

**chat-console** is a websockets-based chat server with a browser console-based client. The server is written in Node.js, and uses the [ws](https://www.npmjs.com/package/ws) package for websockets. The client is written in vanilla JavaScript, and has a command-line interface. It can be added to any web page with a single script tag.

The app also uses the [OpenAI GPT-3.5 API](https://platform.openai.com/docs/api-reference/) to power a chatbot which can be interacted with in the chatroom.

---

## Client Use

To use the chat client, you must first open the browser's JavaScript console. This can be done by pressing `F12` in most browsers. Once the console is open, you can use the following commands:

- **connect** - Connect to the chat room with the previously used nickname, or anonymously if no nickname was used
- **join \`**\<nickname>**\`** - Connect to the chat room with a nickname. Enclose the nickname in **backticks**. (be sure to use *backticks*, not apostrophes!)
- **say \`**\<message>**\`** - Send a message to the chat room. Enclose the message in **backticks**.
- **users** - List current users present in the chat room.
- **logout** - Disconnect from the chat room.
- **log** - Show the current chat log.
- **save** - Save the current chat log to text file. You will be prompted for a filename and location.
- **load** - Load chat log from file and display it in the console. You will be prompted for a filename and location.
- **clear** - Clear the console.
- **cancel** - Cancel the pending chatbot response. If you have sent a message to the chatbot, but have not yet received a response, you can cancel the request with this command.
- **unsay** - Remove the last user message and chatbot response from the chatbot conversation. Each time you interact with the chatbot, all of your previous interactions for that session are sent along with the current message. The chatbot has no memory of the conversation otherwise, and it uses this message log for context. If you use `unsay` to undo one or more chatbot interactions, the chatbot will no longer have any "memory" of the "unsaid" correspondence. (Note that this command does not remove the message from the user's local chat log.)
- **help** - Display the help message.

---

## Server Use

1. **Clone the repo** - `git clone https://github.com/fermentaionist/chat-console.git`
2. **Install dependencies** - `cd chat-console`, then`npm install`
3. **Start the server** - `npm start`

The server will listen on port 8080 by default.

* To add the client to a web page, add the following script tag to the page, replacing `yourserver.tld` with the hostname of your chat server:

```html
<script async src="https://yourserver.tld/chatConsole.js" type="module" ></script>
```

The chat server is configured to create a separate chat room for each hostname that connects to it. This means that if you have multiple websites, you can add the client to each of them, and each website will have its own chat room.

### Chatbot

1. **Create an account with OpenAI** - [OpenAI](https://platform.openai.com/)
2. **Get an API key** - OpenAI [API settings page](https://platform.openai.com/account/api-keys)
3. **Add API key to server environment variables** - `OPENAI_API_KEY=yourkey`
4. **Set `ACTIVATE_BOT` environment variable** - `ACTIVATE_BOT=true`
5. **Activate chatbot for all hosts, or specific hosts** - The value of the `BOT_ENABLED_HOSTNAMES` environment variable must be an array. To activate the chatbot for all hostnames, simply add a `*` to the array: `BOT_ENABLED_HOSTNAMES=["*"]`. To enable the chatbot for selected hostnames only, add the hostnames to the array: `BOT_ENABLED_HOSTNAMES=["yourserver.tld", "yourserver2.tld"]`. If a hostname is not listed, that host's chat room will have no chatbot.
6. **Set chatbot name** - `BOT_NAME=yourbotname` (optional) This is the name that will be displayed in the chat room when the chatbot sends a message. If not included, the default value of "ChatBot" will be used.
7. **Set chatbot instructions** - `BOT_INSTRUCTIONS="your instructions"` (optional) If provided, will be used as the chatbot's system prompt to define its behavior. Refer to the AI as "the assistant" when formulating instructions. (e.g. "The assistant is a chatbot that answers questions about the weather.")

### Keeping the Server Awake
If you are using a free service to host your server that spins down and sleeps when not used for a while, you can use the `WAKE_SERVER_URL` and `WAKE_SERVER_INTERVAL` environment variables to keep the server awake. The server will make a fetch call to the URL every `WAKE_SERVER_INTERVAL` milliseconds. 

*Using this method to keep the server awake may even be necessary in case the server doesn't "count" active websocket connections as activity, causing it to sleep while users are still connected.*

Since free hosting services may limit the number of hours per month that your server can be up and running, you might only want the server to wake up during certain hours of the day. You can use the `WAKE_SERVER_START_HOUR` and `WAKE_SERVER_END_HOUR` environment variables to set the hours during which the server should wake up. The server will only make fetch calls to keep itself awake if it is already awake, and if the current hour is between `WAKE_SERVER_START_HOUR` and `WAKE_SERVER_END_HOUR`. If these variables are not set, the server will wake up at all hours. (WARNING: Since the server will spin down when not in use, it will not be able to wake itself up at the start of the next day. There is of course, no way to circumvent this limitation without having a server that is always running somewhere.)

### Environment Variables

- **`PORT`** - The port on which the https server will listen, if not included, default value of 8080 will be used
- **`OPENAI_API_KEY`** - needed to connect to the OpenAI API, to power chatbot if used
- **`ACTIVATE_BOT`** - if "true", chatbot will be activated for all hosts listed in BOT_ENABLED_HOSTNAMES
- **`BOT_ENABLED_HOSTNAMES`** - An array of strings - a list of hostnames whose chat rooms should have the chatbot present. If a hostname is not listed, that host's chat room will have no chatbot.
- **`BOT_NAME`** - The name to give the AI chatbot, if not included, default value will be used
- **`BOT_INSTRUCTIONS`** - If provided, will be used as the chatbot's system prompt to define its behavior. Refer to the AI as "the assistant" when formulating instructions. (e.g. "The assistant is a chatbot that answers questions about the weather.")
- **`VERBOSE_LOGS`** - if "true", server will log the content of all user chat messages
- **`WAKE_SERVER_URL`** - URL of the chat server, if present, server will make a fetch call to this URL every WAKE_SERVER_INTERVAL milliseconds
- **`WAKE_SERVER_INTERVAL`** - milliseconds to wait between calls to WAKE_SERVER_URL
- **`WAKE_SERVER_NAP_START`** - time (HH:MM) to stop waking server, if not present, no naptime will be set
- **`WAKE_SERVER_NAP_END`** - time (HH:MM) to resume waking server, if not present, no naptime will be set

---

### License

#### Copyright © 2023 [Dennis Hodges](https://dennis-hodges.com)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Source: http://opensource.org/licenses/ISC