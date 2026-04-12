const express = require("express");
const crypto = require("crypto");
const Session = require("../models/Session");
const Participant = require("../models/Participant");
const Attendance = require("../models/Attendance");

const router = express.Router();
const MAX_ROOM_ID_RETRIES = 5;
const sessionEndTimers = new Map();
let ioInstance = null;

function generateRoomId() {
  return crypto.randomBytes(8).toString("hex");
}

function setSocketIo(io) {
  ioInstance = io;
}

const getRemainingTimeMs = (session) => {
  const endTime = session.endTime
    ? new Date(session.endTime).getTime()
    : (session.startTime ? new Date(session.startTime).getTime() : Date.now()) + (session.duration || 0) * 60000;
  return Math.max(endTime - Date.now(), 0);
};

const scheduleSessionEnd = async (session) => {
  if (!session || !session._id || !session.isActive) return;

  if (!session.endTime && session.startTime && session.duration) {
    session.endTime = new Date(new Date(session.startTime).getTime() + session.duration * 60000);
    await session.save();
  }

  const remaining = getRemainingTimeMs(session);

  if (sessionEndTimers.has(session._id.toString())) {
    clearTimeout(sessionEndTimers.get(session._id.toString()));
    sessionEndTimers.delete(session._id.toString());
  }

  if (remaining <= 0) {
    await endSessionById(session._id.toString());
    return;
  }

  const timer = setTimeout(async () => {
    await endSessionById(session._id.toString());
  }, remaining);

  sessionEndTimers.set(session._id.toString(), timer);
};

const endSessionById = async (sessionId) => {
  const session = await Session.findById(sessionId);
  if (!session || !session.isActive) {
    return null;
  }

  session.isActive = false;
  session.status = 'ended';
  session.endTime = session.endTime || new Date();
  await session.save();

  let requiredTime = 0;
  if (session.minAttendanceType === 'percentage') {
    requiredTime = (session.minAttendanceValue / 100) * session.duration * 60;
  } else {
    requiredTime = session.minAttendanceValue * 60;
  }

  const attendances = await Attendance.find({ sessionId: session._id });
  const bulkOps = attendances.map((att) => ({
    updateOne: {
      filter: { _id: att._id },
      update: {
        status: att.presentTime >= requiredTime ? 'Present' : 'Absent'
      }
    }
  }));

  if (bulkOps.length > 0) {
    await Attendance.bulkWrite(bulkOps);
  }

  if (ioInstance && session.roomId) {
    ioInstance.to(session.roomId).emit('session-ended', {
      sessionId: session._id,
      roomId: session.roomId
    });
  }

  if (sessionEndTimers.has(session._id.toString())) {
    clearTimeout(sessionEndTimers.get(session._id.toString()));
    sessionEndTimers.delete(session._id.toString());
  }

  return session;
};

const initializeActiveSessionTimers = async () => {
  try {
    // Check if database is connected before querying
    if (require('mongoose').connection.readyState !== 1) {
      console.warn('[Sessions] Database not connected yet. Skipping session timer initialization.');
      // Retry in 5 seconds
      setTimeout(initializeActiveSessionTimers, 5000);
      return;
    }
    
    const activeSessions = await Session.find({ isActive: true }).maxTimeMS(3000);
    console.log(`[Sessions] Initialized ${activeSessions.length} active session timers`);
    activeSessions.forEach((session) => {
      scheduleSessionEnd(session);
    });
  } catch (err) {
    console.error('[Sessions] Failed to initialize session timers:', err.message);
    // Retry in 5 seconds
    setTimeout(initializeActiveSessionTimers, 5000);
  }
};

setTimeout(initializeActiveSessionTimers, 3000);

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
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const session = new Session({
          title: title.trim(),
          instructor: req.user.id,
          roomId: generateRoomId(),
          isActive: true,
          status: 'active',
          participants: [],
          startTime,
          endTime,
          duration: duration,
          minAttendanceType: minAttendanceType,
          minAttendanceValue: minAttendanceValue
        });

        await session.save();
        await scheduleSessionEnd(session);
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

    const session = await endSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: "Session not found or already ended" });
    }

    res.json({
      success: true,
      session,
      message: 'Session ended and attendance finalized'
    });
  } catch (err) {
    console.error("End session error:", err);
    res.status(500).json({ error: "Server error while ending session" });
  }
});

router.setSocketIo = setSocketIo;

module.exports = router;
/* ================= PUBLIC JOIN ================= */
router.get("/public/join/:code", async (req, res) => {
  try {
    const session = await Session.findOne({ roomId: req.params.code });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (!session.isActive) {
      return res.status(400).json({ error: "Session is not active" });
    }

    res.json({
      success: true,
      sessionId: session._id,
      roomId: session.roomId,
      message: "Session found"
    });

  } catch (err) {
    console.error("Public join error:", err);
    res.status(500).json({ error: "Server error" });
  }
});