# chat-console
---

## About

**chat-console** is a WebSocket-based chat server with a browser console client. The server is written in Node.js and uses the [ws](https://www.npmjs.com/package/ws) package for WebSockets. The client is written in vanilla JavaScript with a command-line interface, and can be added to any web page with a single script tag.

The app optionally integrates with the [OpenAI API](https://platform.openai.com/docs/api-reference/) to power a configurable chatbot in the chat room.

---

## Client Use

To use the chat client, open the browser's JavaScript console (`F12` in most browsers) and type commands directly.

### Commands

| Command | Description |
|---|---|
| `connect` | Connect with the previously used handle, or anonymously |
| `join \`<handle>\`` | Connect with a handle (enclose in **backticks**, not apostrophes) |
| `say \`<message>\`` | Send a public message to the chat room |
| `bot \`<message>\`` | Send a private message to the chatbot |
| `to \`<handle>\`` | Set the recipient for subsequent private messages |
| `pm \`<message>\`` | Send a private message to the recipient set with `to` |
| `users` | List users currently in the chat room |
| `logout` | Disconnect from the chat room |
| `cancel` | Cancel a pending chatbot response |
| `undo` | Remove your last message and the chatbot's reply from its conversation history |
| `forget` | Clear your entire private chatbot conversation history |
| `log` | Show the current chat log |
| `clear` | Clear the console |
| `save` | Save the chat log to a text file |
| `load` | Load a chat log from a file and display it in the console |
| `help` | Display the help message |

Most commands have aliases — for example, `say` also works as `send`, `talk`, `chat`, `s`, or `_`; `pm` also works as `dm` or `whisper`; `logout` also works as `quit`, `exit`, or `disconnect`.

### Interacting with the Chatbot

There are two ways to exchange messages with the chatbot.

1. **Public chatbot** (requires `PUBLIC_CHATBOT_ENABLED=true`)
    - The chatbot listens to the public chat room for its wake-word (its name by default). Any public message containing the wake-word triggers a public reply visible to everyone.
    - Example: `` say `ChatBot, what is the weather like today?` ``
    - All users' public messages to the bot share a single conversation history.

2. **Private chatbot**
    - Use the `bot` command, or use `to \`<botname>\`` followed by `pm`, to send a private message to the chatbot. Only you see the response.
    - Each user has their own private conversation history with the bot.

> **Note:** `undo` removes the last exchange from the bot's context window so it has no "memory" of it, but does not remove the message from your local chat log. `forget` clears the entire private history.

---

## Development

### Installation

1. **Clone the repo** — `git clone https://github.com/fermentaionist/chat-console.git`
2. **Install dependencies** — `cd chat-console && pnpm install`
3. **Configure environment** — copy `sample.env` to `.env` and fill in values
4. **Start the server** — `pnpm start`

The server listens on port `8080` by default.

To add the client to a web page, include this script tag, replacing `yourserver.tld` with your chat server's hostname:

```html
<script async src="https://yourserver.tld/chatConsole.js" type="module"></script>
```

The server creates a separate chat room for each connecting hostname, so multiple sites can share a single server instance with isolated rooms.

### Unit Tests

```
pnpm test
```

Tests are written with [Jest](https://jestjs.io/).

### Chatbot Setup

1. Create an [OpenAI](https://platform.openai.com/) account and obtain an API key
2. Add the key to your `.env`: `OPENAI_API_KEY=your-key`
3. Enable the chatbot: `CHATBOT_ENABLED=true`
4. Specify which hostnames get a chatbot: `BOT_ENABLED_HOSTNAMES=yourserver.tld` (or `*` for all)

### Keeping the Server Awake

If you host on a free service that spins down idle servers, set `WAKE_SERVER_URL` to your server's URL. The server will periodically fetch that URL to stay alive. This is useful because some hosts do not count active WebSocket connections as activity.

Use `WAKE_SERVER_NAP_START` and `WAKE_SERVER_NAP_END` to restrict wake-up pings to certain hours (e.g., daytime only), which helps stay within free-tier hourly limits.

> **Note:** Because the server cannot wake itself from a full spin-down, it will not resume pinging at `WAKE_SERVER_NAP_END` if it has already gone to sleep. An always-on service elsewhere would be needed to wake it back up.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the HTTP server listens on |
| `OPENAI_API_KEY` | — | OpenAI API key, required for chatbot |
| `CHATBOT_ENABLED` | `false` | Set to `true` to enable the chatbot |
| `BOT_ENABLED_HOSTNAMES` | — | Comma-separated hostnames that get a chatbot; use `*` for all |
| `BOT_NAME` | `ChatBot` | Display name for the chatbot |
| `BOT_WAKEWORD` | *(same as `BOT_NAME`)* | Word that triggers the public chatbot; defaults to the bot's name |
| `BOT_MODEL` | `gpt-4o-mini` | OpenAI model used by the chatbot |
| `BOT_INSTRUCTIONS` | — | System prompt defining the chatbot's behavior (refer to the AI as "the assistant") |
| `PUBLIC_CHATBOT_ENABLED` | `false` | Set to `true` to allow the chatbot to respond in the public chat room |
| `BOT_RATE_LIMIT` | `10` | Max messages per user per rate window; `0` disables rate limiting |
| `BOT_RATE_WINDOW_MS` | `60000` | Rate limit window in milliseconds (default: 1 minute) |
| `BOT_TOKEN_LIMIT_PER_USER` | `0` | Max total OpenAI tokens a user may consume per session; `0` disables the limit |
| `VERBOSE_LOGS` | `false` | Set to `true` to log the content of all chat messages server-side |
| `WAKE_SERVER_URL` | — | URL to periodically fetch to keep the server from spinning down |
| `WAKE_SERVER_INTERVAL` | `840000` | Milliseconds between wake pings (default: 14 minutes) |
| `WAKE_SERVER_NAP_START` | — | Time (`HH:MM`) to stop sending wake pings |
| `WAKE_SERVER_NAP_END` | — | Time (`HH:MM`) to resume sending wake pings |

---

## License

#### Copyright © 2023 [Dennis Hodges](https://dennis-hodges.com)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Source: http://opensource.org/licenses/ISC
