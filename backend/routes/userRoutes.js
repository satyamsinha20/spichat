const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// GET /api/users/search?username=...
// friend search by username (email hide)
router.get("/search", protect, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.json([]);
    }

    const regex = new RegExp(username, "i");

    const users = await User.find({
      username: regex,
      _id: { $ne: req.user._id }, // khud ko exclude
    }).select("name username profilePic");

    res.json(users);
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/me  (current user info + friends)
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("friends", "name username profilePic");

    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
