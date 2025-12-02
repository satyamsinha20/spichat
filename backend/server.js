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

// ========== SOCKET.IO (multi–device support) ==========

// userId -> active connections count (for online list)
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // ---- user online ----
  socket.on("user-online", (userId) => {
    if (!userId) return;

    // socket ko userId yaad rakho
    socket.userId = userId;

    // user ke room me join karao (multi-device)
    socket.join(userId);

    const prevCount = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, prevCount + 1);

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // ---- send message ----
  // data: { conversationId, receiverId, senderId, text, createdAt, message }
  socket.on("send-message", (data) => {
    const { receiverId, senderId } = data || {};
    if (!receiverId || !senderId) return;

    // receiver ke SAARE devices
    io.to(receiverId).emit("receive-message", data);

    // sender ke baaki devices (jis device se bheja usko chhod ke)
    socket.to(senderId).emit("receive-message", data);
  });

  // ---- typing indicator ----
  // data: { conversationId, from, to, isTyping }
  socket.on("typing", (data) => {
    const { from, to } = data || {};
    if (!to) return;

    // receiver ke saare devices
    io.to(to).emit("typing", data);

    // optionally: sender ke dusre devices ko bhi dikha sakte ho
    socket.to(from).emit("typing", data);
  });

  // ---- messages seen ----
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data) => {
    const { to, userId } = data || {};
    if (!to) return;

    // receiver side (jisko tumne seen notify kiya)
    io.to(to).emit("messages-seen", data);

    // sender ke dusre devices
    if (userId) {
      socket.to(userId).emit("messages-seen", data);
    }
  });

  // ---- message deleted ----
  // data: { conversationId, messageId, updated, to, from }
  socket.on("message-deleted", (data) => {
    const { to, from } = data || {};
    if (!to && !from) return;

    if (to) {
      io.to(to).emit("message-deleted", data);
    }
    if (from) {
      socket.to(from).emit("message-deleted", data);
    }
  });

  // ---- disconnect ----
  socket.on("disconnect", () => {
    const userId = socket.userId;

    if (userId) {
      const prevCount = onlineUsers.get(userId) || 0;
      if (prevCount <= 1) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, prevCount - 1);
      }
      io.emit("online-users", Array.from(onlineUsers.keys()));
    }

    console.log("Client disconnected:", socket.id);
  });
});

// ========== REST API ==========

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

// health check
app.get("/", (req, res) => {
  res.send("spichat backend running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
