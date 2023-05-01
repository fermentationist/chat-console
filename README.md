# chat-console
---

## About

**chat-console** is a websockets-based chat server with a browser console-based client. The server is written in Node.js, and uses the [ws](https://www.npmjs.com/package/ws) package for websockets. The client is written in vanilla JavaScript.

The app also uses the [OpenAI GPT-3.5 API](https://platform.openai.com/docs/api-reference/) to power a chatbot which can be interacted with in the chatroom.

---

## Client Use

To use the chat client, you must first open the browser's JavaScript console. This can be done by pressing `F12` in most browsers. Once the console is open, you can use the following commands:

- **connect** - Connect to the chat room with previously used nickname, or anonymously if no nickname was used
- **join \`\<nickname>\`** - Connect to the chat room with a nickname. Enclose the nickname in backticks. (be sure to use backticks, not apostrophes!)
- **say \`\<message>\`** - Send a message to the chat room. Enclose the message in backticks.
- **users** - List current users present in the chat room.
- **logout** - Disconnect from the chat room.
- **log** - Show the current chat log.
- **save** - Save the current chat log to text file. You will be prompted for a filename and location.
- **load** - Load chat log from file and display it in the console. You will be prompted for a filename and location.
- **clear** - Clear the console.
- **help** - Display the help message.

---

## Development

### Use

To use the app, you must first install the dependencies with `npm install`. Then, you can start the server with `npm start`. The server will listen on port 8080 by default.

To add the client to a web page, add the following script tag to the page, replacing `yourserver.tld` with the hostname of your server:

```html
<script async src="https://yourserver.tld/chatConsole.js" type="module" ></script>
```

The chat server is configured to create a separate chat room for each hostname that connects to it. This means that if you have multiple websites, you can add the client to each of them, and each website will have its own chat room.

If you want to use the chatbot, you must first create an account with [OpenAI](https://beta.openai.com/). Once you have an account, you can get an API key from the [API settings page](https://beta.openai.com/account/api-keys). Once you have an API key, you can add it to the server's environment variables as `OPENAI_API_KEY`.

If you are using a free service to host your server, like render.com, that spins down and sleeps when not used for a while, you can use the `WAKE_SERVER_URL` and `WAKE_SERVER_INTERVAL` environment variables to keep the server awake. The server will make a fetch call to the URL every `WAKE_SERVER_INTERVAL` milliseconds.

### Environment Variables


- **`PORT`** - The port on which the https server will listen, if not included, default value of 8080 will be used
- **`OPENAI_API_KEY`** - needed to connect to the OpenAI API, to power chatbot if used
- **`ACTIVATE_BOT`** - if "true", chatbot will be activated for all hosts listed in BOT_ENABLED_HOSTNAMES
- **`BOT_ENABLED_HOSTNAMES`** - An array of strings - a list of hostnames whose chat rooms should have the chatbot present. If a hostname is not listed, that host's chat room will have no chatbot.
- **`BOT_NAME`** - The name to give the AI chatbot, if not included, default value will be used
- **`VERBOSE_LOGS`** - if "true", server will log the content of all user chat messages
- **`WAKE_SERVER_URL`** - URL of the chat server, if present, server will make a fetch call to this URL every WAKE_SERVER_INTERVAL milliseconds
- **`WAKE_SERVER_INTERVAL`** - milliseconds to wait between calls to WAKE_SERVER_URL
- **`WAKE_SERVER_NAP_START`** - time (HH:MM) to stop waking server, if not present, no naptime will be set
- **`WAKE_SERVER_NAP_END`** - time (HH:MM) to resume waking server, if not present, no naptime will be set
---

### License

#### Copyright © 2023, [Dennis Hodges](https://dennis-hodges.com)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Source: http://opensource.org/licenses/ISC