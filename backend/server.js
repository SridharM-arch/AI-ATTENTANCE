require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const Participant = require("./models/Participant");

const app = express();
const server = http.createServer(app);

const uploadsDir = path.join(__dirname, 'uploads', 'face-images');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


/* ---------------- CORS ---------------- */

/* ---------------- CORS ---------------- */

const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      "https://connectogether.vercel.app",   // ✅ correct frontend URL
      "http://localhost:5173"
    ];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);

    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/favicon.ico", (req, res) => res.status(204));

/* ---------------- MONGODB ---------------- */

let dbConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;

const connectMongoDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/attendance-system";
    
    console.log(`[DB Connection] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}: ${mongoUri.substring(0, 50)}...`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    dbConnected = true;
    console.log("✓ MongoDB connected successfully");
    
    // Clean up obsolete indexes
    try {
      await mongoose.connection.db.collection("sessions").dropIndex("meetingId_1");
      console.log("Dropped obsolete index: meetingId_1");
    } catch (indexErr) {
      if (indexErr.codeName !== "IndexNotFound") {
        console.log("Index cleanup warning:", indexErr.message);
      }
    }
  } catch (err) {
    console.error(`✗ MongoDB connection failed (Attempt ${retryCount + 1}):`, err.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in 3 seconds...`);
      setTimeout(() => connectMongoDB(retryCount + 1), 3000);
    } else {
      console.error("[CRITICAL] MongoDB connection failed after max retries. Running in degraded mode.");
      dbConnected = false;
    }
  }
};

// Start connection immediately
connectMongoDB();

// Monitor connection state
mongoose.connection.on('connected', () => {
  dbConnected = true;
  console.log("✓ [Mongoose] Connection established");
});

mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  console.warn("✗ [Mongoose] Connection disconnected");
});

mongoose.connection.on('error', (err) => {
  dbConnected = false;
  console.error("[Mongoose Error]", err.message);
});

/* Database Ready Middleware - Non-blocking */
const checkDatabaseConnection = (req, res, next) => {
  // Log but don't block - allow operations to attempt and handle errors naturally
  if (!dbConnected) {
    console.warn(`[AUTH] Database not ready (stat: ${mongoose.connection.readyState}). Request will attempt operation.`);
  }
  next();
};

/* ---------------- ROUTES ---------------- */

const authenticateToken = require("./middleware/auth");

app.use("/api/users", checkDatabaseConnection, require("./routes/users"));
app.use("/api/auth", checkDatabaseConnection, require("./routes/auth"));
app.use("/api/attendance", authenticateToken, require("./routes/attendance"));
app.use("/api/sessions/public", require("./routes/sessionsPublic"));
const sessionsRouter = require("./routes/sessions");
app.use("/api/sessions", authenticateToken, sessionsRouter);

/* ---------------- SOCKET.IO ---------------- */
const io = socketIo(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

if (typeof sessionsRouter.setSocketIo === 'function') {
  sessionsRouter.setSocketIo(io);
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

/* ============ IN-MEMORY ATTENDANCE REQUEST STORE ============ */
const attendanceRequests = {}; // sessionId -> { requests: [], approvals: {} }

function getSessionRequests(sessionId) {
  if (!attendanceRequests[sessionId]) {
    attendanceRequests[sessionId] = {
      requests: [],
      approvals: {}
    };
  }
  return attendanceRequests[sessionId];
}

function findRequestByStudentId(sessionId, studentId) {
  const session = getSessionRequests(sessionId);
  return session.requests.find(r => r.studentId === studentId);
}

function removeRequest(sessionId, studentId) {
  const session = getSessionRequests(sessionId);
  session.requests = session.requests.filter(r => r.studentId !== studentId);
}

/* ============ END STORE ============ */

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "User:", socket.userId);

  socket.on("join-room", (roomId, userId) => {
    if (userId !== socket.userId) return; // Security check
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", userId);
  });

  socket.on("leave-room", (roomId, userId) => {
    if (userId !== socketA.userId) return;
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", userId);
  });

  socket.on("sending-signal", (payload) => {
    io.to(payload.userToSignal).emit("receiving-signal", {
      from: socket.userId,
      signal: payload.signal
    });
  });

  socket.on("returning-signal", (payload) => {
    io.to(payload.callerID).emit("receiving-returned-signal", {
      id: socket.userId,
      signal: payload.signal
    });
  });

  socket.on("attendance-marked", async (data) => {
    if (data.userId !== socket.userId) return;
    try {
      await Participant.findOneAndUpdate(
        { session: data.sessionId, user: data.userId },
        { isActive: true },
        { new: true }
      );

      io.to(data.roomId).emit("attendance-update", {
        userId: data.userId,
        present: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Attendance update error:', error);
    }
  });

  socket.on('reaction', (payload) => {
    if (!payload?.roomId || !payload?.emoji) return;
    io.to(payload.roomId).emit('reaction', {
      emoji: payload.emoji,
      sender: payload.sender || 'Anonymous',
      id: `${socket.id}-${Date.now()}`
    });
  });

  /* ============ ATTENDANCE REQUEST HANDLERS ============ */

  // Student sends attendance request
  socket.on('send_attendance_request', (data) => {
    if (data.studentId !== socket.userId) return; // Security check

    const { studentId, studentName, sessionId } = data;

    // Validate required fields
    if (!studentId || !studentName || !sessionId) {
      socket.emit('request_error', { error: 'Invalid request data' });
      return;
    }

    // Check if student already has a pending request
    const session = getSessionRequests(sessionId);
    const existingRequest = findRequestByStudentId(sessionId, studentId);

    if (existingRequest) {
      socket.emit('request_error', { error: 'You already have a pending request' });
      return;
    }

    // Add request to store
    const request = {
      id: `req_${Date.now()}_${studentId}`,
      studentId,
      studentName,
      sessionId,
      timestamp: new Date(),
      status: 'pending'
    };

    session.requests.push(request);

    console.log(`📋 New attendance request from ${studentName} (${studentId}) in session ${sessionId}`);

    // Emit to all users in the session (mainly for hosts)
    io.to(sessionId).emit('new_attendance_request', {
      request,
      totalPending: session.requests.length
    });

    // Confirmation to student
    socket.emit('request_sent', {
      requestId: request.id,
      message: 'Attendance request sent to host'
    });

    // Toast notification
    socket.emit('show_toast', {
      type: 'info',
      message: `Attendance request sent to host`
    });
  });

  // Host approves attendance request
  socket.on('approve_attendance_request', async (data) => {
    const { requestId, sessionId, studentId } = data;

    if (!requestId || !sessionId || !studentId) {
      socket.emit('request_error', { error: 'Invalid approval data' });
      return;
    }

    const session = getSessionRequests(sessionId);

    // Find and remove the request
    const request = session.requests.find(r => r.id === requestId);
    if (!request) {
      socket.emit('request_error', { error: 'Request not found' });
      return;
    }

    removeRequest(sessionId, studentId);

    // Mark approval in store
    session.approvals[studentId] = {
      approvedAt: new Date(),
      approvedBy: socket.userId
    };

    console.log(`✅ Approved attendance request from ${request.studentName} (${studentId})`);

    // Notify all participants
    io.to(sessionId).emit('request_approved', {
      studentId,
      studentName: request.studentName,
      requestId,
      timestamp: new Date()
    });

    // Specific notification to student
    io.emit('attendance_approved', {
      studentId,
      message: 'Your attendance request was approved!',
      timestamp: new Date()
    });

    // Update attendance in DB (optional)
    try {
      await Participant.findOneAndUpdate(
        { session: sessionId, user: studentId },
        { isActive: true, markedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating attendance in DB:', error);
    }
  });

  // Host rejects attendance request
  socket.on('reject_attendance_request', (data) => {
    const { requestId, sessionId, studentId, reason } = data;

    if (!requestId || !sessionId || !studentId) {
      socket.emit('request_error', { error: 'Invalid rejection data' });
      return;
    }

    const session = getSessionRequests(sessionId);

    // Find and remove the request
    const request = session.requests.find(r => r.id === requestId);
    if (!request) {
      socket.emit('request_error', { error: 'Request not found' });
      return;
    }

    removeRequest(sessionId, studentId);

    console.log(`❌ Rejected attendance request from ${request.studentName} (${studentId})`);

    // Notify all participants
    io.to(sessionId).emit('request_rejected', {
      studentId,
      studentName: request.studentName,
      requestId,
      reason: reason || 'Your request was rejected',
      timestamp: new Date()
    });

    // Specific notification to student
    io.emit('attendance_rejected', {
      studentId,
      message: reason || 'Your attendance request was rejected',
      timestamp: new Date()
    });
  });

  // Get all pending requests for a session
  socket.on('get_pending_requests', (sessionId) => {
    if (!sessionId) {
      socket.emit('request_error', { error: 'Session ID required' });
      return;
    }

    const session = getSessionRequests(sessionId);
    socket.emit('pending_requests', {
      requests: session.requests,
      total: session.requests.length
    });
  });

  // Host joins a session (to receive requests)
  socket.on('join_session_as_host', (sessionId) => {
    if (!sessionId) return;

    socket.join(`host_${sessionId}`);
    console.log(`Host ${socket.userId} joined session ${sessionId}`);

    // Send current pending requests
    const session = getSessionRequests(sessionId);
    socket.emit('pending_requests', {
      requests: session.requests,
      total: session.requests.length
    });
  });

  /* ============ END ATTENDANCE REQUEST HANDLERS ============ */

  socket.on('disconnect', () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
