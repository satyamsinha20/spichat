// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) socket.disconnect();
      setSocket(null);
      return;
    }

    const s = io("https://spichat-backend.onrender.com", {
      withCredentials: true,
      // transports ko force mat karo – default rehne do (polling + websocket)
      reconnection: true,
      reconnectionAttempts: 5,
    });

    s.on("connect", () => {
      console.log("Socket connected from client:", s.id);
      // 🔥 yahi se server ko bata rahe hain kaun sa user online hai
      s.emit("user-online", user._id);
    });

    s.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]); // socket ko dependency me mat daalna

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
