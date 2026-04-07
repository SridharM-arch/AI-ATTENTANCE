require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const Participant = require("./models/Participant");

const app = express();
const server = http.createServer(app);

/* ---------------- CORS ---------------- */

app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST"],
  credentials: true
}));

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/favicon.ico", (req, res) => res.status(204));

/* ---------------- MONGODB ---------------- */

mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/attendance-system"
).then(() => {
  console.log("MongoDB connected");
  mongoose.connection.db.collection("sessions").dropIndex("meetingId_1")
    .then(() => {
      console.log("Dropped obsolete index: meetingId_1");
    })
    .catch((indexErr) => {
      if (indexErr.codeName !== "IndexNotFound") {
        console.log("Index cleanup warning:", indexErr.message);
      }
    });
}).catch(err => {
  console.log("MongoDB connection failed:", err.message);
});

/* ---------------- ROUTES ---------------- */

const authenticateToken = require("./middleware/auth");

app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/attendance", authenticateToken, require("./routes/attendance"));
app.use("/api/sessions/public", require("./routes/sessionsPublic"));
app.use("/api/sessions", authenticateToken, require("./routes/sessions"));

/* ---------------- SOCKET.IO ---------------- */

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "User:", socket.userId);

  socket.on("join-room", (roomId, userId) => {
    if (userId !== socket.userId) return; // Security check
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", userId);
  });

  socket.on("leave-room", (roomId, userId) => {
    if (userId !== socket.userId) return;
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
      // Update participant status
      await Participant.findOneAndUpdate(
        { session: data.sessionId, user: data.userId },
        { isActive: true, lastSeen: new Date() }
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
