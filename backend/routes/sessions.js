const express = require("express");
const crypto = require("crypto");
const Session = require("../models/Session");
const Participant = require("../models/Participant");

const router = express.Router();
const MAX_ROOM_ID_RETRIES = 5;

function generateRoomId() {
  return crypto.randomBytes(8).toString("hex");
}

/* ================= CREATE SESSION ================= */
router.post("/", async (req, res) => {
  try {
    console.log('Create session - User:', req.user);
    
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "User not authenticated or role missing" });
    }

    if (!["host", "instructor"].includes(req.user.role)) {
      return res.status(403).json({ error: `Only hosts/instructors can create sessions. Your role: ${req.user.role}` });
    }

    const { title, duration, minAttendanceType, minAttendanceValue } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    // Validate new fields
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: "Duration must be a positive number" });
    }

    if (!minAttendanceType || !['minutes', 'percentage'].includes(minAttendanceType)) {
      return res.status(400).json({ error: "minAttendanceType must be 'minutes' or 'percentage'" });
    }

    if (!minAttendanceValue || minAttendanceValue <= 0) {
      return res.status(400).json({ error: "minAttendanceValue must be positive" });
    }

    if (minAttendanceType === 'percentage' && minAttendanceValue > 100) {
      return res.status(400).json({ error: "Percentage cannot exceed 100%" });
    }

    for (let attempt = 0; attempt < MAX_ROOM_ID_RETRIES; attempt += 1) {
      try {
        const session = new Session({
          title: title.trim(),
          instructor: req.user.id,
          roomId: generateRoomId(),
          isActive: true,
          participants: [],
          startTime: new Date(),
          duration: duration,
          minAttendanceType: minAttendanceType,
          minAttendanceValue: minAttendanceValue
        });

        await session.save();
        return res.status(201).json(session);
      } catch (saveErr) {
        const isRoomIdDuplicate =
          saveErr.code === 11000 &&
          saveErr.keyPattern &&
          saveErr.keyPattern.roomId;

        if (!isRoomIdDuplicate) {
          throw saveErr;
        }
      }
    }

    return res.status(500).json({
      error: "Could not generate a unique room ID. Please try again."
    });
  } catch (err) {
    console.error("Create session error FULL:", err);
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0] || "unknown";
      return res.status(409).json({
        error: `Duplicate value for ${duplicateField}. Please retry.`,
        duplicateField
      });
    }
    return res.status(500).json({ error: "Server error while creating session" });
  }
});

/* ================= GET ALL SESSIONS ================= */
router.get("/", async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate("instructor")
      .populate("participants");

    res.json(sessions);
  } catch (err) {
    console.error("Fetch sessions error:", err);
    res.status(500).json({ error: "Server error while fetching sessions" });
  }
});

/* ================= JOIN SESSION ================= */
router.post("/:id/join", async (req, res) => {
  try {
    console.log(`[JOIN] User ${req.user.id} attempting to join session ${req.params.id}`);
    
    if (!req.user || !req.user.id) {
      console.error('[JOIN] User not authenticated');
      return res.status(401).json({ error: "User not authenticated" });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      console.error(`[JOIN] Session not found: ${req.params.id}`);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`[JOIN] Session found. Active: ${session.isActive}`);

    if (!session.isActive) {
      console.error(`[JOIN] Session is not active: ${req.params.id}`);
      return res.status(403).json({ error: "Session is not active" });
    }

    const existing = await Participant.findOne({
      session: session._id,
      user: req.user.id
    });

    if (existing) {
      console.log(`[JOIN] User already joined: ${req.user.id}`);
      return res.status(400).json({ error: "Already joined" });
    }

    const participant = new Participant({
      session: session._id,
      user: req.user.id,
      isActive: true
    });

    await participant.save();
    console.log(`[JOIN] Participant saved: ${participant._id}`);

    session.participants.push(participant._id);
    await session.save();
    console.log(`[JOIN] SUCCESS: User ${req.user.id} joined session ${req.params.id}`);

    res.json(participant);
  } catch (err) {
    console.error("[JOIN] Session join error:", err.message, err.stack);
    res.status(500).json({ error: "Server error while joining session", details: err.message });
  }
});

/* ================= ANALYTICS ================= */
router.get("/:id/analytics", async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("participants");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const totalParticipants = session.participants.length;
    const activeParticipants = session.participants.filter(
      (p) => p.isActive
    ).length;

    // Get attendance records
    const Attendance = require("../models/Attendance");
    const attendances = await Attendance.find({ sessionId: req.params.id });
    const totalAttendanceMarks = attendances.length;
    const verifiedAttendanceMarks = attendances.filter(a => a.status === 'Present').length;

    const analytics = {
      totalParticipants,
      activeParticipants,
      avgAttendance: totalAttendanceMarks > 0 ? 
        (verifiedAttendanceMarks / totalAttendanceMarks) * 100 : 0,
      sessionDuration: session.endTime
        ? (session.endTime - session.startTime) / 1000
        : (Date.now() - session.startTime) / 1000,
      activeNow: session.isActive,
      totalAttendanceMarks,
      verifiedAttendanceMarks
    };

    res.json(analytics);
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Server error while fetching analytics" });
  }
});

/* ================= END SESSION ================= */
router.post("/:id/end", async (req, res) => {
  try {
    if (!["host", "instructor"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only hosts/instructors can end sessions" });
    }

    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { isActive: false, endTime: new Date() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Calculate required time
    let requiredTime;
    if (session.minAttendanceType === 'percentage') {
      requiredTime = (session.minAttendanceValue / 100) * session.duration * 60; // convert to seconds
    } else {
      requiredTime = session.minAttendanceValue * 60; // convert to seconds
    }

    // Finalize attendance using the new attendance system
    const axios = require('axios');
    try {
      await axios.post(`http://localhost:5000/api/attendance/finalize/${req.params.id}`, {
        requiredTime: requiredTime
      }, {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      });
    } catch (finalizeErr) {
      console.error('Failed to finalize attendance:', finalizeErr.message);
      // Continue with session ending even if finalization fails
    }

    res.json({
      success: true,
      session: session,
      requiredTime: requiredTime,
      message: 'Session ended and attendance finalized'
    });
  } catch (err) {
    console.error("End session error:", err);
    res.status(500).json({ error: "Server error while ending session" });
  }
});

module.exports = router;
