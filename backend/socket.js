const { Server } = require('socket.io');

// In-memory stores
const roomUsers = new Map();
const socketToRoom = new Map();

function getRoomUsers(roomId) {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  return roomUsers.get(roomId);
}

function addUserToRoom(roomId, userId, socketId, userInfo) {
  const users = getRoomUsers(roomId);
  users.set(userId, { socketId, userId, userInfo, joinedAt: new Date() });
  socketToRoom.set(socketId, roomId);
}

function removeUserFromRoom(roomId, userId) {
  const users = getRoomUsers(roomId);
  users.delete(userId);
  if (users.size === 0) {
    roomUsers.delete(roomId);
  }
}

function removeSocketFromRoom(socketId) {
  const roomId = socketToRoom.get(socketId);
  if (roomId) {
    const users = getRoomUsers(roomId);
    for (const [userId, userData] of users.entries()) {
      if (userData.socketId === socketId) {
        removeUserFromRoom(roomId, userId);
        socketToRoom.delete(socketId);
        return { roomId, userId, userData };
      }
    }
    socketToRoom.delete(socketId);
  }
  return null;
}

function initSocketIO(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    // =====================================================
    // ROOM MANAGEMENT
    // =====================================================
    socket.on('join-room', (data) => {
      const { roomId, userId, userInfo } = data;
      if (!roomId || !userId) {
        socket.emit('error', { message: 'Missing roomId or userId' });
        return;
      }

      console.log(`[ROOM] ${userId} joining ${roomId}`);

      // Leave previous room if any
      const previousRoom = socketToRoom.get(socket.id);
      if (previousRoom && previousRoom !== roomId) {
        socket.leave(previousRoom);
        const removed = removeSocketFromRoom(socket.id);
        if (removed) {
          socket.to(previousRoom).emit('user-left', { userId: removed.userId });
        }
      }

      // Join new room
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id, userInfo);

      // Get existing users (excluding self)
      const roomUsersList = Array.from(getRoomUsers(roomId).values()).filter(u => u.userId !== userId);

      // Notify current user
      socket.emit('room-joined', {
        roomId,
        userId,
        socketId: socket.id,
        participants: roomUsersList
      });

      // Notify others
      socket.to(roomId).emit('user-joined', {
        userId,
        socketId: socket.id,
        userInfo: userInfo || { name: 'User', role: 'student' }
      });

      console.log(`[ROOM] ${userId} joined ${roomId}. Total: ${roomUsersList.length + 1}`);
    });

    socket.on('leave-room', (data) => {
      const { roomId, userId } = data;
      socket.leave(roomId);
      removeUserFromRoom(roomId, userId);
      socketToRoom.delete(socket.id);
      socket.to(roomId).emit('user-left', { userId });
      console.log(`[ROOM] ${userId} left ${roomId}`);
    });

    // =====================================================
    // WEBRTC SIGNALING
    // =====================================================
    socket.on('offer', (payload) => {
      const { targetUserId, targetSocketId, offer, userId } = payload;
      if (!targetUserId || !offer) return;

      console.log(`[WEBRTC] Relaying offer from ${userId} to ${targetUserId}`);

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('offer', {
          from: userId,
          fromSocketId: socket.id,
          offer
        });
      }
    });

    socket.on('answer', (payload) => {
      const { targetUserId, targetSocketId, answer, userId } = payload;
      if (!targetUserId || !answer) return;

      console.log(`[WEBRTC] Relaying answer from ${userId} to ${targetUserId}`);

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('answer', {
          from: userId,
          fromSocketId: socket.id,
          answer
        });
      }
    });

    socket.on('ice-candidate', (payload) => {
      const { targetUserId, targetSocketId, candidate, userId } = payload;
      if (!targetUserId || !candidate) return;

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('ice-candidate', {
          from: userId,
          fromSocketId: socket.id,
          candidate
        });
      }
    });

    // =====================================================
    // ATTENDANCE REQUEST SYSTEM
    // =====================================================
    socket.on('attendance-request', (data) => {
      const { studentId, studentName, roomId, timestamp } = data;
      if (!studentId || !roomId) return;

      console.log(`[ATTENDANCE] Request from ${studentName} (${studentId}) in ${roomId}`);

      const requestId = `req_${Date.now()}_${studentId}`;

      // Notify host(s) in room
      socket.to(roomId).emit('attendance-request-received', {
        requestId,
        studentId,
        studentName,
        timestamp,
        roomId
      });

      // Confirm to student
      socket.emit('attendance-confirmation', { requestId, message: 'Request sent to host' });
    });

    socket.on('attendance-response', (data) => {
      const { requestId, studentId, roomId, accepted, timestamp } = data;
      console.log(`[ATTENDANCE] Response for ${studentId}: ${accepted ? 'ACCEPTED' : 'REJECTED'}`);

      // Get student socket and send directly
      const users = getRoomUsers(roomId);
      const studentData = users.get(studentId);

      if (studentData) {
        io.to(studentData.socketId).emit('attendance-response', {
          requestId,
          studentId,
          accepted,
          message: accepted ? 'Your attendance was accepted' : 'Your attendance was rejected'
        });
      }
    });

    // =====================================================
    // DISCONNECT
    // =====================================================
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected: ${socket.id}, reason: ${reason}`);

      const removed = removeSocketFromRoom(socket.id);
      if (removed) {
        const { roomId, userId } = removed;
        socket.to(roomId).emit('user-left', { userId });
        console.log(`[ROOM] Cleaned up ${userId} from ${roomId}`);
      }
    });
  });

  return io;
}

module.exports = { initSocketIO };
