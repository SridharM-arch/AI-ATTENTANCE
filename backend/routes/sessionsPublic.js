const express = require("express");
const Session = require("../models/Session");
const User = require("../models/User");

const router = express.Router();

// Public join lookup: accepts roomId or hostId.
router.get("/join/:code", async (req, res) => {
  try {
    const rawCode = (req.params.code || "").trim();
    if (!rawCode) {
      return res.status(400).json({ error: "Session code is required" });
    }

    let session = await Session.findOne({
      roomId: rawCode,
      isActive: true
    }).populate("instructor");

    if (!session) {
      const host = await User.findOne({
        hostId: rawCode.toUpperCase()
      });

      if (host) {
        session = await Session.findOne({
          instructor: host._id,
          isActive: true
        })
          .sort({ startTime: -1 })
          .populate("instructor");
      }
    }

    if (!session) {
      return res.status(404).json({ error: "Invalid session/host code" });
    }

    return res.json(session);
  } catch (err) {
    console.error("Public join lookup error:", err);
    return res.status(500).json({ error: "Server error while validating session code" });
  }
});

module.exports = router;
