const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
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

// ========= SOCKET.IO (multi-device, room based) =========

// userId -> active connection count (online list ke liye)
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const userId = socket.handshake?.auth?.userId;

  console.log("Socket connected:", socket.id, "user:", userId);

  if (userId) {
    // socket pe userId store
    socket.userId = String(userId);

    // user ke room me join karao (multi-device)
    socket.join(socket.userId);

    const prev = onlineUsers.get(socket.userId) || 0;
    onlineUsers.set(socket.userId, prev + 1);

    io.emit("online-users", Array.from(onlineUsers.keys()));
  }

  // ---- send message ----
  // data: { conversationId, receiverId, senderId, text, createdAt, message }
  socket.on("send-message", (data = {}) => {
    const { receiverId, senderId } = data;
    if (!receiverId || !senderId) return;

    const rId = String(receiverId);
    const sId = String(senderId);

    // 1) receiver ke saare devices
    io.to(rId).emit("receive-message", data);

    // 2) sender ke baaki devices (jis socket ne bheja usko chhod ke)
    socket.to(sId).emit("receive-message", data);
  });

  // ---- typing indicator ----
  // data: { conversationId, from, to, isTyping }
  socket.on("typing", (data = {}) => {
    const { from, to } = data;
    if (!to) return;

    const toId = String(to);
    const fromId = from ? String(from) : null;

    io.to(toId).emit("typing", data);     // receiver side
    if (fromId) socket.to(fromId).emit("typing", data); // sender ke dusre devices
  });

  // ---- messages seen ----
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data = {}) => {
    const { to, userId } = data;
    if (!to) return;

    const toId = String(to);
    const uId = userId ? String(userId) : null;

    io.to(toId).emit("messages-seen", data);
    if (uId) socket.to(uId).emit("messages-seen", data);
  });

  // ---- message deleted ----
  // data: { conversationId, messageId, updated, to, from }
  socket.on("message-deleted", (data = {}) => {
    const { to, from } = data;
    if (to) io.to(String(to)).emit("message-deleted", data);
    if (from) socket.to(String(from)).emit("message-deleted", data);
  });

  socket.on("disconnect", () => {
    const userId = socket.userId;
    console.log("Socket disconnected:", socket.id, "user:", userId);

    if (userId) {
      const prev = onlineUsers.get(userId) || 0;
      if (prev <= 1) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, prev - 1);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
