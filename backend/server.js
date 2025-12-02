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

// ========= SOCKET.IO (simple 1-socket-per-user realtime) =========

// userId -> socketId
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // transports ko default rehne do (polling + websocket)
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // client se: socket.emit("user-online", user._id)
  socket.on("user-online", (userIdRaw) => {
    if (!userIdRaw) return;
    const userId = String(userIdRaw);

    socket.userId = userId;
    onlineUsers.set(userId, socket.id);

    console.log("user-online:", userId, "socket:", socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // ---- send message ----
  // data: { conversationId, receiverId, senderId, text, createdAt, message }
  socket.on("send-message", (data = {}) => {
    const { receiverId } = data;
    if (!receiverId) return;

    const receiverSocketId = onlineUsers.get(String(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", data);
    }
  });

  // ---- messages seen ----
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data = {}) => {
    const { to } = data;
    if (!to) return;

    const receiverSocketId = onlineUsers.get(String(to));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messages-seen", data);
    }
  });

  // ---- message deleted ----
  // data: { conversationId, messageId, updated, to }
  socket.on("message-deleted", (data = {}) => {
    const { to } = data;
    if (!to) return;

    const receiverSocketId = onlineUsers.get(String(to));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-deleted", data);
    }
  });

  socket.on("disconnect", () => {
    const userId = socket.userId;
    console.log("Socket disconnected:", socket.id, "user:", userId);

    if (userId && onlineUsers.get(userId) === socket.id) {
      onlineUsers.delete(userId);
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
