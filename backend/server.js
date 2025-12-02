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

// ----------------- SOCKET.IO SETUP (multi-device) -----------------

// userId -> Set<socketId>
const onlineUsers = new Map();

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

function getUserSockets(userId) {
  return onlineUsers.get(userId) || new Set();
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // user online
  socket.on("user-online", (userId) => {
    if (!userId) return;

    const existing = onlineUsers.get(userId) || new Set();
    existing.add(socket.id);
    onlineUsers.set(userId, existing);

    // sirf unique userIds bhejte hain
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  // send-message: receiver + sender ke saare sockets ko bhejo
  socket.on("send-message", (data) => {
    const { receiverId, senderId } = data;
    if (!receiverId || !senderId) return;

    const receiverSockets = getUserSockets(receiverId);
    const senderSockets = getUserSockets(senderId);

    const targets = new Set([
      ...receiverSockets,
      ...senderSockets,
    ]);

    // jis socket ne message bheja usko dobara mat bhejo
    targets.delete(socket.id);

    targets.forEach((sockId) => {
      io.to(sockId).emit("receive-message", data);
    });
  });

  // typing indicator (optional multi-device)
  socket.on("typing", (data) => {
    const { from, to } = data || {};
    if (!to) return;

    const receiverSockets = getUserSockets(to);

    receiverSockets.forEach((sockId) => {
      // sender ka current socket already type kar raha hai, usko mat bhejo
      if (sockId === socket.id) return;
      io.to(sockId).emit("typing", data);
    });
  });

  // messages-seen (both sides ke devices ko update)
  socket.on("messages-seen", (data) => {
    const { to, userId } = data || {};
    if (!to) return;

    const receiverSockets = getUserSockets(to);
    const senderSockets = userId ? getUserSockets(userId) : new Set();

    const targets = new Set([
      ...receiverSockets,
      ...senderSockets,
    ]);

    targets.forEach((sockId) => {
      if (sockId === socket.id) return;
      io.to(sockId).emit("messages-seen", data);
    });
  });

  // message-deleted
  socket.on("message-deleted", (data) => {
    const { to, from } = data || {};
    if (!to && !from) return;

    const toSockets = to ? getUserSockets(to) : new Set();
    const fromSockets = from ? getUserSockets(from) : new Set();

    const targets = new Set([
      ...toSockets,
      ...fromSockets,
    ]);

    targets.forEach((sockId) => {
      if (sockId === socket.id) return;
      io.to(sockId).emit("message-deleted", data);
    });
  });

  socket.on("disconnect", () => {
    // iss socket ko saare users ke Set se remove karo
    for (const [userId, sockets] of onlineUsers.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        } else {
          onlineUsers.set(userId, sockets);
        }
        break;
      }
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
    console.log("Client disconnected:", socket.id);
  });
});

// ----------------- REST API -----------------

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
