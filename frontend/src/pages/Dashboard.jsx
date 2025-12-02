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
import { useLocation, useNavigate } from "react-router-dom";

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
  const msgInputRef = useRef(null);

  const activeTab =
    location.pathname.includes("/friends")
      ? "friends"
      : location.pathname.includes("/chat")
      ? "chat"
      : "home";

  // initial load 
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
        console.error("Dashboard initial load", err);
      }
    };
    load();
  }, [token]);

  const loadConversations = async () => {
    try {
      const data = await getMyConversations(token);
      setConversations(data);
    } catch (err) {
      console.error("Conversations load error", err);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") loadConversations();
  }, [activeTab]);

  // SOCKET event listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit("user-online", user._id);

    socket.on("online-users", setOnlineUsers);

    socket.on("receive-message", (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
      loadConversations();
    });

    return () => {
      socket.off("online-users");
      socket.off("receive-message");
    };
  }, [socket, conversationId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await searchUsers(searchQuery, token);
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openChatWithFriend = async (friend, existingConvId = null) => {
    try {
      setSelectedFriend(friend);
      setLoadingChat(true);
      setMessages([]);

      let convId = existingConvId;
      if (!convId) {
        const conv = await getOrCreateConversation(friend._id, token);
        convId = conv._id;
      }

      setConversationId(convId);

      const data = await getMessages(convId, token);
      setMessages(data);

      navigate("/dashboard/chat");
    } catch (err) {
      console.error("Chat open error", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedFriend || !msgInputRef.current) return;

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

      socket.emit("send-message", {
        conversationId,
        receiverId: selectedFriend._id,
        senderId: user._id,
        text,
        message: savedMessage,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  // ---------- Views ----------
  const HomeView = () => (
    <div className="flex-1 flex items-center justify-center">
      <button
        className="bg-indigo-600 px-4 py-2 rounded-lg"
        onClick={() => navigate("/dashboard/friends")}
      >
        Add Friends & Chat
      </button>
    </div>
  );

  const FriendsView = () => (
    <div className="p-4">
      <form className="flex gap-2 mb-4" onSubmit={handleSearch}>
        <input
          className="bg-slate-800 px-3 py-2 rounded"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="bg-indigo-600 px-3 py-2 rounded-lg">Search</button>
      </form>

      <h3 className="text-sm font-bold mb-2">Your Friends</h3>
      {friends.map((f) => (
        <div
          key={f._id}
          className="bg-slate-800 p-3 mb-2 rounded cursor-pointer"
          onClick={() => openChatWithFriend(f)}
        >
          {f.name}
        </div>
      ))}
    </div>
  );

  const ChatView = () => (
    <div className="flex-1 flex flex-col">
      <div className="bg-slate-900 p-3 border-b">Chat with {selectedFriend?.name}</div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div
            key={m._id}
            className={`p-2 rounded-lg max-w-xs ${
              m.sender === user._id ? "bg-indigo-600 ml-auto" : "bg-slate-700"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t flex gap-2"
      >
        <input
          ref={msgInputRef}
          className="flex-1 bg-slate-800 px-3 py-2 rounded"
          placeholder="Type..."
        />
        <button className="bg-indigo-600 px-3 py-2 rounded-lg">Send</button>
      </form>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Navbar */}
      <header className="h-14 flex items-center justify-between border-b px-4">
        <span className="font-bold">sPichat</span>

        <nav className="flex gap-3 text-sm">
          <button onClick={() => navigate("/dashboard")} className={activeTab === "home" ? "text-indigo-400" : ""}>
            Home
          </button>
          <button onClick={() => navigate("/dashboard/friends")} className={activeTab === "friends" ? "text-indigo-400" : ""}>
            Friends
          </button>
          <button onClick={() => navigate("/dashboard/chat")} className={activeTab === "chat" ? "text-indigo-400" : ""}>
            Chat
          </button>
        </nav>

        <button onClick={logout}>Logout</button>
      </header>

      {/* Page Content */}
      {activeTab === "home" && <HomeView />}
      {activeTab === "friends" && <FriendsView />}
      {activeTab === "chat" && <ChatView />}
    </div>
  );
}
