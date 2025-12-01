import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  searchUsers,
  sendFriendRequest,
  getIncomingRequests,
  respondFriendRequest,
  getFriends,
} from "../api/friends";
import {
  getMyConversations,
  getOrCreateConversation,
  getMessages,
  sendMessageApi,
  markMessagesSeen,
  deleteMessageApi,
} from "../api/chat";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [conversations, setConversations] = useState([]); // 🔥 recent chats list

  const [typingFromFriend, setTypingFromFriend] = useState(false);
  const typingTimeoutRef = useRef(null);

  // active view: "home" | "friends" | "chat"
  const [activeTab, setActiveTab] = useState("home");

  // initial data: friends + incoming requests
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const [friendsData, reqData] = await Promise.all([
          getFriends(token),
          getIncomingRequests(token),
        ]);
        setFriends(friendsData);
        setRequests(reqData);
      } catch (err) {
        console.error("Initial dashboard load error", err);
      }
    };

    load();
  }, [token]);

  // conversations list load function
  const loadConversations = async () => {
    if (!token) return;
    try {
      const data = await getMyConversations(token);
      setConversations(data);
    } catch (err) {
      console.error("Load conversations error", err);
    }
  };

  // jab Chat tab pe aate ho, recent chats load karo
  useEffect(() => {
    if (activeTab === "chat") {
      loadConversations();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleOnline = (ids) => {
      setOnlineUsers(ids);
    };

    const handleReceiveMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
      // naya message aaya, conversations list refresh kar lo
      loadConversations();
    };

    const handleTyping = (data) => {
      if (
        data.conversationId === conversationId &&
        data.from === selectedFriend?._id
      ) {
        setTypingFromFriend(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingFromFriend(false);
          }, 1500);
        }
      }
    };

    const handleMessagesSeen = (data) => {
      if (
        data.conversationId === conversationId &&
        data.userId === selectedFriend?._id
      ) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === user._id || m.sender?._id === user._id
              ? { ...m, seen: true }
              : m
          )
        );
      }
    };

    const handleMessageDeleted = (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev
          .map((m) =>
            m._id === data.messageId ? { ...m, ...data.updated } : m
          )
          .filter((m) => !m.deletedFor?.includes(user._id))
      );
    };

    socket.on("online-users", handleOnline);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("online-users", handleOnline);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket, conversationId, user, selectedFriend]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFriendOnline = (friendId) => {
    return onlineUsers.includes(friendId);
  };

  // search by username
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const data = await searchUsers(searchQuery.trim(), token);
      setSearchResults(data);
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId, token);
      alert("Friend request sent ✅");
    } catch (err) {
      alert(
        err?.response?.data?.message || "Could not send friend request."
      );
    }
  };

  const handleRespondRequest = async (id, action) => {
    try {
      await respondFriendRequest(id, action, token);
      const [friendsData, reqData] = await Promise.all([
        getFriends(token),
        getIncomingRequests(token),
      ]);
      setFriends(friendsData);
      setRequests(reqData);
    } catch (err) {
      console.error("Respond request error", err);
    }
  };

  // ✅ friend se chat open (Friends tab se) – agar conv nhi hoga to bana dega
  const openChatWithFriend = async (friend, existingConversationId = null) => {
    try {
      setSelectedFriend(friend);
      setLoadingChat(true);
      setMessages([]);
      setConversationId(null);
      setTypingFromFriend(false);

      let convId = existingConversationId;

      if (!convId) {
        const conv = await getOrCreateConversation(friend._id, token);
        convId = conv._id;
      }

      setConversationId(convId);

      const msgs = await getMessages(convId, token);
      setMessages(msgs);

      try {
        await markMessagesSeen(convId, token);
        if (socket) {
          socket.emit("messages-seen", {
            conversationId: convId,
            userId: user._id,
            to: friend._id,
          });
        }
      } catch (err) {
        console.error("Mark seen error", err);
      }

      // ensure conversations list updated
      loadConversations();

      // Chat tab pe chale jao
      setActiveTab("chat");
    } catch (err) {
      console.error("Open chat error", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if (!msgInput.trim() || !conversationId || !selectedFriend) return;

    const text = msgInput.trim();
    setMsgInput("");
    setSendingMsg(true);

    try {
      const savedMessage = await sendMessageApi(
        conversationId,
        text,
        selectedFriend._id,
        token
      );

      setMessages((prev) => [...prev, savedMessage]);
      loadConversations();

      if (socket) {
        socket.emit("send-message", {
          conversationId,
          receiverId: selectedFriend._id,
          senderId: user._id,
          text,
          createdAt: savedMessage.createdAt,
          message: savedMessage,
        });

        socket.emit("typing", {
          conversationId,
          from: user._id,
          to: selectedFriend._id,
          isTyping: false,
        });
      }
    } catch (err) {
      console.error("Send message error", err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMsgInput(value);

    if (!socket || !selectedFriend || !conversationId) return;

    socket.emit("typing", {
      conversationId,
      from: user._id,
      to: selectedFriend._id,
      isTyping: true,
    });
  };

  const handleDeleteMessage = async (msg, forEveryone = true) => {
    const confirmText = forEveryone
      ? "Delete this message for everyone?"
      : "Delete this message for you only?";

    if (!window.confirm(confirmText)) return;

    try {
      const res = await deleteMessageApi(msg._id, forEveryone, token);
      const updated = res.updated;

      setMessages((prev) =>
        prev
          .map((m) => (m._id === msg._id ? { ...m, ...updated } : m))
          .filter((m) => !m.deletedFor?.includes(user._id))
      );

      if (socket && selectedFriend && conversationId && forEveryone) {
        socket.emit("message-deleted", {
          conversationId,
          messageId: msg._id,
          updated,
          to: selectedFriend._id,
        });
      }
      loadConversations();
    } catch (err) {
      console.error("Delete message error", err);
    }
  };

  const visibleMessages = messages.filter(
    (m) => !m.deletedFor?.includes(user._id)
  );
  const lastMyMessageId =
    visibleMessages
      .filter(
        (mm) => mm.sender === user._id || mm.sender?._id === user._id
      )
      .slice(-1)[0]?._id || null;

  // ---------- UI components ----------

  const HomeView = () => (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-lg">
          <h1 className="text-xl md:text-2xl font-semibold mb-2">
            Hi, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Welcome to your real-time chat dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Friends</div>
              <div className="text-2xl font-semibold mt-1">
                {friends.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                People you can chat with.
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Pending requests</div>
              <div className="text-2xl font-semibold mt-1">
                {requests.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                New people want to connect.
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Online friends</div>
              <div className="text-2xl font-semibold mt-1">
                {friends.filter((f) => isFriendOnline(f._id)).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Available to chat right now.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("friends")}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
            >
              View friends & requests
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs"
            >
              Open recent chats
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const FriendsView = () => (
    <div className="flex-1 overflow-auto px-3 md:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">Search friends</h2>
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-medium"
            >
              Search
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-3 space-y-2 max-h-52 overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-800/70 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {u.profilePic ? (
                      <img
                        src={u.profilePic}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                        {u.name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-[10px] text-slate-400">
                        @{u.username}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendFriendRequest(u._id)}
                    className="text-[10px] px-3 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends & requests */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Friends list */}
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Your friends</h2>
              <span className="text-[11px] text-slate-400">
                {friends.length} total
              </span>
            </div>

            {friends.length === 0 ? (
              <p className="text-xs text-slate-500">
                You don't have any friends yet. Search above and send a request.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f._id}
                    onClick={() => openChatWithFriend(f)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left text-xs hover:bg-slate-800/80 ${
                      selectedFriend?._id === f._id ? "bg-slate-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {f.profilePic ? (
                        <img
                          src={f.profilePic}
                          alt={f.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                          {f.name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-[12px]">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{f.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px]">
                      {isFriendOnline(f._id) ? (
                        <span className="text-emerald-400">Online</span>
                      ) : (
                        <span className="text-slate-500">Offline</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Friend requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold mb-2">Friend requests</h2>
            {requests.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No pending requests.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-2 hover:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-2">
                      {r.from.profilePic ? (
                        <img
                          src={r.from.profilePic}
                          alt={r.from.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                          {r.from.name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{r.from.name}</div>
                        <div className="text-[10px] text-slate-400">
                          @{r.from.username}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleRespondRequest(r._id, "accept")
                        }
                        className="px-2 py-1 rounded bg-emerald-600 text-[10px]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleRespondRequest(r._id, "reject")
                        }
                        className="px-2 py-1 rounded bg-slate-800 text-[10px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 🔥 CHAT VIEW – left: recent chats list, right: selected chat
  const ChatView = () => (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950">
      {/* LEFT: conversations list */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/70 max-h-56 md:max-h-none md:h-auto">
        <div className="px-3 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent chats</h2>
          <span className="text-[10px] text-slate-400">
            {conversations.length} chats
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-3 text-[11px] text-slate-500">
            No conversations yet. Start a chat from Friends tab.
          </div>
        ) : (
          <div className="max-h-48 md:max-h-full overflow-y-auto p-2 space-y-1">
            {conversations.map((conv) => {
              const partner = conv.participants.find(
                (p) => p._id !== user._id
              );
              const isActive =
                selectedFriend && partner && selectedFriend._id === partner._id;
              return (
                <button
                  key={conv._id}
                  onClick={() => openChatWithFriend(partner, conv._id)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left text-xs hover:bg-slate-800/80 ${
                    isActive ? "bg-slate-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {partner?.profilePic ? (
                      <img
                        src={partner.profilePic}
                        alt={partner.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                        {partner?.name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-[12px]">
                        {partner?.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{partner?.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px]">
                    {partner && isFriendOnline(partner._id) ? (
                      <span className="text-emerald-400">Online</span>
                    ) : (
                      <span className="text-slate-500">Offline</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* RIGHT: messages */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden mr-1 px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900"
              onClick={() => setActiveTab("home")}
            >
              ← Back
            </button>

            {selectedFriend ? (
              <>
                {selectedFriend.profilePic ? (
                  <img
                    src={selectedFriend.profilePic}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {selectedFriend.name?.[0]}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">
                    {selectedFriend.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    @{selectedFriend.username} ·{" "}
                    {isFriendOnline(selectedFriend._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-500">
                Select a chat from the list
              </span>
            )}
          </div>

          <button
            className="hidden md:inline-flex px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900"
            onClick={() => setActiveTab("home")}
          >
            Back to dashboard
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {loadingChat ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              Loading chat...
            </div>
          ) : !selectedFriend ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              Select a conversation from the left to start chatting.
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="text-xs text-slate-500 text-center mt-4">
              No messages yet. Say hi 👋
            </div>
          ) : (
            visibleMessages.map((m) => {
              const isMe =
                m.sender === user._id || m.sender?._id === user._id;
              const showDeleted = m.isDeleted;
              const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isLastMyMessage = isMe && m._id === lastMyMessageId;

              return (
                <div
                  key={m._id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-end gap-1 max-w-xs md:max-w-md">
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[9px]">
                        {selectedFriend?.name?.[0]}
                      </div>
                    )}

                    <div
                      className={`px-3 py-2 rounded-2xl text-xs ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-slate-800 text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      <div
                        className={
                          showDeleted ? "italic text-slate-300/70" : ""
                        }
                      >
                        {showDeleted ? "This message was deleted" : m.text}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] mt-1 text-slate-300/70">
                        <span>{timeStr}</span>
                        {isMe && isLastMyMessage && (
                          <span>{m.seen ? "✓✓ seen" : "✓ sent"}</span>
                        )}
                      </div>
                    </div>

                    {isMe && !showDeleted && (
                      <button
                        onClick={() => handleDeleteMessage(m, true)}
                        className="text-[9px] text-slate-500 hover:text-red-400"
                        title="Delete for everyone"
                      >
                        del
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {typingFromFriend && selectedFriend && (
            <div className="px-1 pt-1 text-[11px] text-slate-400">
              {selectedFriend.name} is typing...
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="border-t border-slate-800 p-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-xs"
            >
              +
            </button>
            <input
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={
                selectedFriend ? "Type a message..." : "Select a chat first"
              }
              value={msgInput}
              onChange={handleInputChange}
              disabled={!selectedFriend || sendingMsg}
            />
            <button
              type="submit"
              disabled={!selectedFriend || sendingMsg || !msgInput.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingMsg ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top navbar */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-bold shadow-md">
            sP
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm md:text-base">
              sPichat
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block">
              Connect with your friends instantly
            </span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 md:gap-2 text-[11px] md:text-xs">
          <button
            onClick={() => setActiveTab("home")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "home"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-transparent hover:bg-slate-900"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-3 py-1 rounded-full border flex items-center gap-1 ${
              activeTab === "friends"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-transparent hover:bg-slate-900"
            }`}
          >
            Friends
            {friends.length > 0 && (
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full">
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "chat"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-transparent hover:bg-slate-900"
            }`}
          >
            Chat
          </button>
        </nav>

        {/* User + logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                {user?.name?.[0]}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-medium truncate max-w-[100px]">
                {user?.name}
              </div>
              <div className="text-[10px] text-slate-400">
                @{user?.username}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-3 py-1 rounded-lg text-[11px] bg-slate-900 border border-slate-700 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content based on active tab */}
      <main className="flex-1 flex flex-col">
        {activeTab === "home" && <HomeView />}
        {activeTab === "friends" && <FriendsView />}
        {activeTab === "chat" && <ChatView />}
      </main>
    </div>
  );
}
