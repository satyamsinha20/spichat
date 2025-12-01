const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

const router = express.Router();

// POST /api/friends/request/:userId  -> send friend request
router.post("/request/:userId", protect, async (req, res) => {
  try {
    const toUserId = req.params.userId;

    if (toUserId === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: "User not found" });

    // already friends?
    const alreadyFriend = req.user.friends?.some(
      (id) => String(id) === String(toUserId)
    );
    if (alreadyFriend) {
      return res.status(400).json({ message: "Already friends" });
    }

    // existing pending request?
    const existing = await FriendRequest.findOne({
      from: req.user._id,
      to: toUserId,
      status: "pending",
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Friend request already sent" });
    }

    const request = await FriendRequest.create({
      from: req.user._id,
      to: toUserId,
    });

    res.status(201).json(request);
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/friends/requests  -> incoming friend requests
router.get("/requests", protect, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user._id,
      status: "pending",
    })
      .populate("from", "name username profilePic")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Get friend requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/friends/requests/:id/accept
router.post("/requests/:id/accept", protect, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id).populate(
      "from to"
    );

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.to._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already handled" });
    }

    request.status = "accepted";
    await request.save();

    // add each other as friends
    const fromUser = await User.findById(request.from._id);
    const toUser = await User.findById(request.to._id);

    if (!fromUser.friends.includes(toUser._id)) {
      fromUser.friends.push(toUser._id);
      await fromUser.save();
    }

    if (!toUser.friends.includes(fromUser._id)) {
      toUser.friends.push(fromUser._id);
      await toUser.save();
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/friends/requests/:id/reject
router.post("/requests/:id/reject", protect, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.to) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/friends/list  -> list of friends
router.get("/list", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "name username profilePic"
    );
    res.json(user.friends || []);
  } catch (error) {
    console.error("Get friends list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
