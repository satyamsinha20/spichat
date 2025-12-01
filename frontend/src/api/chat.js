import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getMyConversations = async (token) => {
  const res = await API.get("/chats/conversations", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOrCreateConversation = async (friendId, token) => {
  const res = await API.post(
    `/chats/conversation/${friendId}`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const getMessages = async (conversationId, token) => {
  const res = await API.get(`/chats/messages/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendMessageApi = async (conversationId, text, receiverId, token) => {
  const res = await API.post(
    `/chats/messages/${conversationId}`,
    { text, receiverId },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const markMessagesSeen = async (conversationId, token) => {
  const res = await API.post(
    `/chats/messages/${conversationId}/seen`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const deleteMessageApi = async (messageId, forEveryone, token) => {
  const res = await API.delete(
    `/chats/messages/${messageId}?forEveryone=${forEveryone ? "true" : "false"}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};
