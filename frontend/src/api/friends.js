import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const searchUsers = async (query, token) => {
  const res = await API.get(`/users/search?username=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendFriendRequest = async (userId, token) => {
  const res = await API.post(
    `/friends/request/${userId}`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const getIncomingRequests = async (token) => {
  const res = await API.get("/friends/requests", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const respondFriendRequest = async (requestId, action, token) => {
  const url =
    action === "accept"
      ? `/friends/requests/${requestId}/accept`
      : `/friends/requests/${requestId}/reject`;

  const res = await API.post(
    url,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const getFriends = async (token) => {
  const res = await API.get("/friends/list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
