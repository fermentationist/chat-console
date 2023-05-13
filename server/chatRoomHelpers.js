import chatRooms from "./ChatRooms.js";
let lastBotInteractionWasPublic = false;

export const getUserListMessage = (hostname) => {
  return `Users in room: ${chatRooms.getHandles(hostname).join(", ")}${
    chatRooms.botIsActive(hostname) ? `, ${chatRooms.chatbot.name} (bot)` : ""
  }`;
};

export const addConnection = (hostname, connection, handle) => {
  const user = chatRooms.addConnection(hostname, connection, handle);
  user.send(getUserListMessage(hostname), "server");
  if (chatRooms.botIsActive(hostname)) {
    // send greeting from chatbot
    user.send(
      chatRooms.chatbot.greeting,
      `${chatRooms.chatbot.name} (bot)`
    );
  }
  return user;
}

export const getBotInactiveErrorMessage = (command) => {
  const message = `"${command}" command only works when a chatbot is active`;
};

export const executeCommand = (command, user) => {
  const {chatbot} = chatRooms;
  const hostname = user.hostname
  .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
  .split(/[\/:]/)[0];
  // COMMANDS
  const botIsActive = chatRooms.botIsActive(hostname);
  switch (command) {
    case "users":
      // send list of users in room
      return user.send(getUserListMessage(chatRooms, hostname), "server");
    case "undo":
      if (!botIsActive) {
        // send error message
        return user.send(getBotInactiveErrorMessage("undo"), "server");
      }
      // remove last message and response from bot conversation
      const publicOrPrivate = chatbot.removeLastMessage(
        user.hostname,
        user.id,
        lastBotInteractionWasPublic,
        user.name
      );
      const unsayResponseMessage = publicOrPrivate
        ? `Somehow, you manage to unsay the last thing you said to ${chatbot.name} in ${publicOrPrivate}.`
        : `${
            lastBotInteractionWasPublic
              ? `You can't undo the last public message to ${chatbot.name} because it did not come from you.`
              : `You haven't said anything privately to ${chatbot.name} yet.`
          }`;
      return user.send(unsayResponseMessage, "server");
    case "cancel":
      if (!botIsActive) {
        // send error message
        return user.send(getBotInactiveErrorMessage("cancel"), "server");
      }
      // cancel pending bot completion
      const cancelled = chatbot.cancelPending(user.hostname, userId);
      const cancelMessage = cancelled
        ? `Your pending request to ${chatbot.name} has been cancelled.`
        : `You don't have any pending requests to ${chatbot.name}.`;
      return user.send(cancelMessage, "server");
    case "forget":
      if (!botIsActive) {
        // send error message
        return sendBotInactiveError("forget");
      }
      // forget all messages and responses from bot conversation
      const forgotten = chatbot.forget(user.hostname, user.id);
      const forgetResponseMessage = forgotten
        ? `${chatbot.name} forgets your private conversation.`
        : `You haven't said anything privately to ${chatbot.name} yet.`;
      return user.send(forgetResponseMessage, "server");
    default:
      // send error message
      return user.send(`Command not recognized: ${command}`, "server");
  }
};

export const sendPrivateMessage = (user, recipientHandle, message) => {
  // echoing message back to user
  user.send(
    JSON.stringify({
      user: `${user.name} (to ${recipientHandle})`,
      message,
      timestamp: Date.now(),
    })
  );
  chatRooms.sendPrivateMessage({
    hostname: user.hostname,
    recipient: recipientHandle,
    sender: user.name,
    message,
  });
};

export const broadcast = (hostname, message, senderHandle) => {
  const userMessageObj = {
    user: senderHandle,
    message,
    timestamp: Date.now(),
  };
  chatRooms.broadcast(hostname, userMessageObj);
};

export const chatWithBot = async (user, message, isPublic = false) => {
  if (isPublic) {
    // send message to chat room
    broadcast(user.hostname, message, user.name);
  } else {
    // echo message back to user
    user.send(message, `${user.name} (to ${chatRooms.chatbot.name})`);
  }
  // get response from bot
  const botResponse = await chatRooms.chatbot.converse({
    message,
    hostname: user.hostname,
    userId: user.id,
    userHandle: user.name,
    isPublic,
  });
  // check for cancellation
  if (botResponse === null) {
    // request was cancelled, do nothing
    return;
  }
  // send response from bot
  if (isPublic) {
    // send bot response to chat room
    lastBotInteractionWasPublic = true;
    broadcast(user.hostname, botResponse, `${chatRooms.chatbot.name} [bot]`);
  } else {
    // send bot response to user
    lastBotInteractionWasPublic = false;
    user.send(botResponse, `${chatRooms.chatbot.name} [bot] (private)`);
  }
};

export const isBotAlias = (handle) => {
  return chatRooms.BOT_ALIASES.includes(handle.toLowerCase());
};

export const botIsActive = (hostname) => {
  return chatRooms.botIsActive(hostname);
}

export const shouldWakeBot = (hostname, message) => {
  return botIsActive(hostname) && chatRooms.PUBLIC_CHATBOT_ENABLED && message.toLowerCase().includes(chatRooms.chatbot.wakeword.toLowerCase());
}

export const removeConnection = (hostname, userId) => {
  chatRooms.removeConnection(hostname, userId);
}