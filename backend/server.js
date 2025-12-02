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

// ========= SOCKET.IO (multi-device, "user-online" event based) =========

// Map<userId, Set<socketId>>
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// helper: get all sockets for a userId
const getUserSockets = (userId) => {
  const set = onlineUsers.get(String(userId));
  return set ? Array.from(set) : [];
};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // client se aayega: socket.emit("user-online", user._id)
  socket.on("user-online", (userIdRaw) => {
    const userId = String(userIdRaw);
    socket.userId = userId;

    let set = onlineUsers.get(userId);
    if (!set) set = new Set();
    set.add(socket.id);
    onlineUsers.set(userId, set);

    console.log("user-online:", userId, "sockets:", Array.from(set));
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // ---- send message ----
  // data: { conversationId, receiverId, senderId, text, createdAt, message }
  socket.on("send-message", (data = {}) => {
    const { receiverId, senderId } = data;
    if (!receiverId || !senderId) return;

    const rId = String(receiverId);
    const sId = String(senderId);

    // receiver ke sabhi devices
    getUserSockets(rId).forEach((sid) => {
      io.to(sid).emit("receive-message", data);
    });

    // sender ke dusre devices (current socket ko chhod ke)
    getUserSockets(sId).forEach((sid) => {
      if (sid !== socket.id) {
        io.to(sid).emit("receive-message", data);
      }
    });
  });

  // ---- messages seen ----
  // data: { conversationId, userId, to }
  socket.on("messages-seen", (data = {}) => {
    const { to, userId } = data;
    if (!to) return;

    const toId = String(to);
    const uId = String(userId || "");

    getUserSockets(toId).forEach((sid) => {
      io.to(sid).emit("messages-seen", data);
    });

    if (uId) {
      getUserSockets(uId).forEach((sid) => {
        if (sid !== socket.id) {
          io.to(sid).emit("messages-seen", data);
        }
      });
    }
  });

  // ---- message deleted ----
  // data: { conversationId, messageId, updated, to, from }
  socket.on("message-deleted", (data = {}) => {
    const { to, from } = data;
    if (to) {
      getUserSockets(String(to)).forEach((sid) => {
        io.to(sid).emit("message-deleted", data);
      });
    }
    if (from) {
      getUserSockets(String(from)).forEach((sid) => {
        if (sid !== socket.id) {
          io.to(sid).emit("message-deleted", data);
        }
      });
    }
  });

  socket.on("disconnect", () => {
    const userId = socket.userId;
    console.log("Socket disconnected:", socket.id, "user:", userId);

    if (userId) {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
        } else {
          onlineUsers.set(userId, set);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
