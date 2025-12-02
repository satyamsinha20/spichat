const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const https = require("https");
const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const friendRoutes = require("./routes/friendRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

// dev + prod origins
const allowedOrigins = [
  process.env.CLIENT_URL,      // http://localhost:5173
  process.env.PROD_CLIENT_URL, // https://spichat.vercel.app
].filter(Boolean);

console.log("Allowed origins:", allowedOrigins);

// ========= SOCKET.IO (multi-device support) =========

// userId -> Set<socketId>
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // transports yaha default rehne do (polling + websocket)
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ------- USER ONLINE (frontend se aata: socket.emit("user-online", user._id)) -------
  socket.on("user-online", (userId) => {
    if (!userId) return;

    const uid = String(userId);
    socket.userId = uid;

    let set = onlineUsers.get(uid);
    if (!set) set = new Set();
    set.add(socket.id);
    onlineUsers.set(uid, set);

    console.log("User online:", uid, "sockets:", Array.from(set));
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // ------- SEND MESSAGE -------
  // data: { conversationId, receiverId, senderId, text, createdAt, message }
  socket.on("send-message", (data = {}) => {
    const { receiverId, senderId } = data;
    if (!receiverId || !senderId) return;

    const rId = String(receiverId);
    const sId = String(senderId);

    const receiverSockets = onlineUsers.get(rId) || new Set();
    const senderSockets = onlineUsers.get(sId) || new Set();

    // receiver ke saare devices
    for (const sockId of receiverSockets) {
      io.to(sockId).emit("receive-message", data);
    }

    // sender ke baaki devices (jis se send kiya usko chhodke)
    for (const sockId of senderSockets) {
      if (sockId !== socket.id) {
        io.to(sockId).emit("receive-message", data);
      }
    }
  });

  // ------- TYPING -------
  // data: { conversationId, from, to, isTyping }
  socket.on("typing", (data = {}) => {
    const { from, to } = data;
    if (!to) return;

    const toId = String(to);
    const fromId = from ? String(from) : null;

    const receiverSockets = onlineUsers.get(toId) || new Set();
    for (const sockId of receiverSockets) {
      io.to(sockId).emit("typing", data);
    }

    if (fromId) {
      const senderSockets = onlineUsers.get(fromId) || new Set();
      for (const sockId of senderSockets) {
        if (sockId !== socket.id) {
          io.to(sockId).emit("typing", data);
        }
      }
    }
  });

  // ------- MESSAGES SEEN -------
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data = {}) => {
    const { to, userId } = data;
    if (!to) return;

    const toId = String(to);
    const uId = userId ? String(userId) : null;

    const receiverSockets = onlineUsers.get(toId) || new Set();
    for (const sockId of receiverSockets) {
      io.to(sockId).emit("messages-seen", data);
    }

    if (uId) {
      const senderSockets = onlineUsers.get(uId) || new Set();
      for (const sockId of senderSockets) {
        if (sockId !== socket.id) {
          io.to(sockId).emit("messages-seen", data);
        }
      }
    }
  });

  // ------- MESSAGE DELETED -------
  // data: { conversationId, messageId, updated, to, from }
  socket.on("message-deleted", (data = {}) => {
    const { to, from } = data;

    if (to) {
      const rId = String(to);
      const receiverSockets = onlineUsers.get(rId) || new Set();
      for (const sockId of receiverSockets) {
        io.to(sockId).emit("message-deleted", data);
      }
    }

    if (from) {
      const fId = String(from);
      const senderSockets = onlineUsers.get(fId) || new Set();
      for (const sockId of senderSockets) {
        if (sockId !== socket.id) {
          io.to(sockId).emit("message-deleted", data);
        }
      }
    }
  });

  // ------- DISCONNECT -------
  socket.on("disconnect", () => {
    const uid = socket.userId;
    console.log("Socket disconnected:", socket.id, "user:", uid);

    if (uid) {
      const set = onlineUsers.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(uid);
        } else {
          onlineUsers.set(uid, set);
        }
      }
      io.emit("online-users", Array.from(onlineUsers.keys()));
    }
  });
});

// ========= REST API =========

connectDB();

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);

app.get("/", (req, res) => {
  res.send("spichat backend running");
});

// ========= Render keep-alive (optional) =========
const PING_URL =
  process.env.RENDER_EXTERNAL_URL || "https://spichat-backend.onrender.com";

setInterval(() => {
  https
    .get(PING_URL, (res) => {
      res.on("data", () => {});
    })
    .on("error", (err) => {
      console.log("Keep-alive ping error:", err.message);
    });
}, 4 * 60 * 1000); // 4 min

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
