const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const router = express.Router();

// ✅ NEW: saare conversations list karo jisme current user hai
// GET /api/chats/conversations
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "name username profilePic");

    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/chats/conversation/:friendId -> get or create
router.post("/conversation/:friendId", protect, async (req, res) => {
  try {
    const friendId = req.params.friendId;

    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: "User not found" });

    const me = await User.findById(req.user._id);
    const isFriend = me.friends.some(
      (id) => String(id) === String(friendId)
    );
    if (!isFriend) {
      return res.status(403).json({ message: "Not friends yet" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, friendId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, friendId],
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Get/create conversation error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/chats/messages/:conversationId
router.get("/messages/:conversationId", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    if (
      !conv.participants.some(
        (id) => String(id) === String(req.user._id)
      )
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/chats/messages/:conversationId
router.post("/messages/:conversationId", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, receiverId } = req.body;

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    if (
      !conv.participants.some(
        (id) => String(id) === String(req.user._id)
      )
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiverId,
      text,
    });

    conv.lastMessageAt = new Date();
    await conv.save();

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ mark seen – ye pehle add kiya tha
router.post("/messages/:conversationId/seen", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    const isParticipant = conv.participants.some(
      (id) => String(id) === String(req.user._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user._id,
        seen: false,
      },
      { $set: { seen: true, seenAt: new Date() } }
    );

    res.json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Mark seen error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ delete message – pehle wala hi
router.delete("/messages/:messageId", protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.query;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isSender = String(msg.sender) === String(req.user._id);
    const isParticipant =
      isSender || String(msg.receiver) === String(req.user._id);

    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (forEveryone === "true") {
      if (!isSender) {
        return res
          .status(403)
          .json({ message: "Only sender can delete for everyone" });
      }

      msg.isDeleted = true;
      msg.text = "";
      msg.mediaUrl = "";
      await msg.save();

      return res.json({
        message: "Message deleted for everyone",
        updated: msg,
      });
    }

    if (!msg.deletedFor.includes(req.user._id)) {
      msg.deletedFor.push(req.user._id);
      await msg.save();
    }

    res.json({
      message: "Message deleted for you",
      updated: msg,
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
