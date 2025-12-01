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

// Socket.IO setup (for real-time chat)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // frontend ka URL
    credentials: true,
  },
});

// online users map
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // user online
  // client: socket.emit("user-online", user._id);
  socket.on("user-online", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // 💬 send message real-time
  // client approx:
  // socket.emit("send-message", {
  //   conversationId,
  //   receiverId,
  //   senderId: user._id,
  //   text,
  //   createdAt: savedMessage.createdAt,
  //   message: savedMessage,
  // });
  socket.on("send-message", (data) => {
    const { receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      // doosre user ko yehi data real-time bhej rahe hain
      io.to(receiverSocketId).emit("receive-message", data);
    }
  });

  // ✍ typing indicator
  // data: { conversationId, from, to, isTyping }
  socket.on("typing", (data) => {
    const receiverSocketId = onlineUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", data);
    }
  });

  // ✅ messages seen
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data) => {
    const { to } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messages-seen", data);
    }
  });

  // 🗑 message deleted
  // data: { conversationId, messageId, updated, to }
  socket.on("message-deleted", (data) => {
    const receiverSocketId = onlineUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-deleted", data);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));
    console.log("Client disconnected:", socket.id);
  });
});

connectDB();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
