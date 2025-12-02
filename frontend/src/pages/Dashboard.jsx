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
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversations, setConversations] = useState([]);

  const msgInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("home");

  // --------- data + sockets (same as before) ----------

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

  const loadConversations = async () => {
    if (!token) return;
    try {
      const data = await getMyConversations(token);
      setConversations(data);
    } catch (err) {
      console.error("Load conversations error", err);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      loadConversations();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket || !user) return;

    const handleOnline = (ids) => setOnlineUsers(ids);

    const handleReceiveMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
      loadConversations();
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
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("online-users", handleOnline);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket, conversationId, user, selectedFriend]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFriendOnline = (friendId) => onlineUsers.includes(friendId);

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

  const openChatWithFriend = async (friend, existingConversationId = null) => {
    try {
      setSelectedFriend(friend);
      setLoadingChat(true);
      setMessages([]);
      setConversationId(null);

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

      loadConversations();
      setActiveTab("chat");
    } catch (err) {
      console.error("Open chat error", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if (!conversationId || !selectedFriend || !msgInputRef.current) return;

    const text = msgInputRef.current.value.trim();
    if (!text) return;

    msgInputRef.current.value = "";
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
      }
    } catch (err) {
      console.error("Send message error", err);
    } finally {
      setSendingMsg(false);
    }
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
    <div className="flex-1 flex items-center justify-center px-4 overflow-auto">
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
      {/* ...friends view same as before... */}
      {/* (yaha tum apna existing FriendsView code rakh sakta hai,
          maine structure nahi बदला, sirf outer div me overflow-auto already hai) */}
    </div>
  );

  // CHAT VIEW
  const ChatView = () => (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-950 overflow-hidden">
      {/* LEFT: conversations list */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/70 h-48 md:h-full overflow-y-auto">
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
          <div className="p-2 space-y-1">
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
        {/* header same */}
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

        {/* Messages area – yaha main scrolling hoga */}
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
        </div>

        {/* Message input – fixed bottom, no scroll */}
        <div className="border-t border-slate-800 p-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-xs"
            >
              +
            </button>
            <input
              ref={msgInputRef}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={
                selectedFriend ? "Type a message..." : "Select a chat first"
              }
              disabled={!selectedFriend}
            />
            <button
              type="submit"
              disabled={!selectedFriend || sendingMsg}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingMsg ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ---------- main layout ----------

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "home" && <HomeView />}
        {activeTab === "friends" && <FriendsView />}
        {activeTab === "chat" && <ChatView />}
      </main>
    </div>
  );
}
