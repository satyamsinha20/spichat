import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

import DashboardHome from "./DashboardHome";
import FriendsPage from "./FriendsPage";
import ChatPage from "./ChatPage";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

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

  // message input (uncontrolled)
  const msgInputRef = useRef(null);

  // URL → active tab
  const activeTab = location.pathname.includes("/friends")
    ? "friends"
    : location.pathname.includes("/chat")
    ? "chat"
    : "home";

  // ---------- data initial load ----------
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

  // conversations load ko memoize karte hain taaki socket effect me use kar saken
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyConversations(token);
      setConversations(data);
    } catch (err) {
      console.error("Load conversations error", err);
    }
  }, [token]);

  // chat tab pe aaye → recent chats load
  useEffect(() => {
    if (activeTab === "chat") {
      loadConversations();
    }
  }, [activeTab, loadConversations]);

  // ---------- socket: online list + messages ----------
  useEffect(() => {
    if (!socket || !user) return;

    console.log("🔌 socket useEffect init, conv:", conversationId);

    // bas info ke liye, backend agar 'user-online' sun raha ho to
    socket.emit("user-online", user._id);

    const handleOnline = (ids) => {
      console.log("🟢 online-users:", ids);
      setOnlineUsers(ids);
    };

    const handleReceiveMessage = (data) => {
      console.log("📩 receive-message client:", data);

      // agar same conversation open hai to UI me add karo
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }

      // list hamesha refresh karo (unread / last message etc ke liye)
      loadConversations();
    };

    const handleMessagesSeen = (data) => {
      console.log("👀 messages-seen client:", data);
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
      console.log("🗑 message-deleted client:", data);
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
  }, [socket, user, conversationId, selectedFriend, loadConversations]);

  const isFriendOnline = (friendId) => {
    return onlineUsers.includes(friendId);
  };

  // ---------- handlers: friends / search ----------
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

  // ---------- chat open / send / delete ----------
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
      navigate("/dashboard/chat");
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

    // input clear
    msgInputRef.current.value = "";
    setSendingMsg(true);

    try {
      const savedMessage = await sendMessageApi(
        conversationId,
        text,
        selectedFriend._id,
        token
      );

      // apne UI me turant dikhado
      setMessages((prev) => [...prev, savedMessage]);
      loadConversations();

      if (socket) {
        const payload = {
          conversationId,
          receiverId: selectedFriend._id,
          senderId: user._id,
          text,
          createdAt: savedMessage.createdAt,
          message: savedMessage,
        };
        console.log("📤 send-message emit:", payload);
        socket.emit("send-message", payload);
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

  // filter messages deleted for current user
  const visibleMessages = messages.filter(
    (m) => !m.deletedFor?.includes(user._id)
  );

  const lastMyMessageId =
    visibleMessages
      .filter(
        (mm) => mm.sender === user._id || mm.sender?._id === user._id
      )
      .slice(-1)[0]?._id || null;

  const onlineCount = friends.filter((f) => isFriendOnline(f._id)).length;

  // ---------- UI ----------
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Navbar */}
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
            onClick={() => navigate("/dashboard")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "home"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-transparent hover:bg-slate-900"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navigate("/dashboard/friends")}
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
            onClick={() => navigate("/dashboard/chat")}
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

      {/* Page content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "home" && (
          <DashboardHome
            user={user}
            friendsCount={friends.length}
            requestsCount={requests.length}
            onlineCount={onlineCount}
            onGoFriends={() => navigate("/dashboard/friends")}
            onGoChat={() => navigate("/dashboard/chat")}
          />
        )}

        {activeTab === "friends" && (
          <FriendsPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            searchResults={searchResults}
            friends={friends}
            requests={requests}
            onSendFriendRequest={handleSendFriendRequest}
            onRespondRequest={handleRespondRequest}
            onOpenChat={openChatWithFriend}
            isFriendOnline={isFriendOnline}
          />
        )}

        {activeTab === "chat" && (
          <ChatPage
            user={user}
            conversations={conversations}
            selectedFriend={selectedFriend}
            messages={visibleMessages}
            loadingChat={loadingChat}
            sendingMsg={sendingMsg}
            msgInputRef={msgInputRef}
            onSendMessage={handleSendMessage}
            onOpenChat={openChatWithFriend}
            onBackHome={() => navigate("/dashboard")}
            isFriendOnline={isFriendOnline}
            onDeleteMessage={handleDeleteMessage}
            lastMyMessageId={lastMyMessageId}
          />
        )}
      </main>
    </div>
  );
}
