require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { initSocketIO } = require("./socket");
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


// Get CORS origins from environment, default to production Render URL
const corsOrigins = [
  "https://connectogether.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: corsOrigins,
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
const io = initSocketIO(server);

app.set('io', io);

if (typeof sessionsRouter.setSocketIo === 'function') {
  sessionsRouter.setSocketIo(io);
}

// Socket.IO is initialized via socket.js module - no duplicate handlers needed here

/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
