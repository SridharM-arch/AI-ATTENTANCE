const { Server } = require('socket.io');

// In-memory stores
const roomUsers = new Map(); // roomId -> Map<userId, { socketId, userInfo, joinedAt }>
const socketToRoom = new Map(); // socketId -> roomId
const attendanceRequests = new Map(); // roomId -> Array of requests

function getRoomUsers(roomId) {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  return roomUsers.get(roomId);
}

function addUserToRoom(roomId, userId, socketId, userInfo) {
  const users = getRoomUsers(roomId);
  users.set(userId, {
    socketId,
    userId,
    userInfo,
    joinedAt: new Date()
  });
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

function getAllRoomUsers(roomId) {
  const users = getRoomUsers(roomId);
  return Array.from(users.values());
}

function initSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // =====================================================
    // ROOM MANAGEMENT
    // =====================================================

    socket.on('join-room', (data) => {
      const { roomId, userId, userInfo } = data;

      if (!roomId || !userId) {
        console.error('[SOCKET] Missing roomId or userId');
        socket.emit('error', { message: 'Missing roomId or userId' });
        return;
      }

      console.log(`[SOCKET] ${userId} joining room: ${roomId}`);

      // Leave previous room if any
      const previousRoom = socketToRoom.get(socket.id);
      if (previousRoom && previousRoom !== roomId) {
        console.log(`[SOCKET] Leaving previous room: ${previousRoom}`);
        socket.leave(previousRoom);
        const removed = removeSocketFromRoom(socket.id);
        if (removed) {
          socket.to(previousRoom).emit('user-left', {
            userId: removed.userId,
            roomId: previousRoom,
            timestamp: new Date()
          });
        }
      }

      // Join new room
      socket.join(roomId);
      addUserToRoom(roomId, userId, socket.id, userInfo || { userId, role: 'student' });

      // Get all users currently in room (excluding self)
      const roomUsersList = getAllRoomUsers(roomId).filter(u => u.userId !== userId);

      console.log(`[SOCKET] Room ${roomId} users:`, roomUsersList.map(u => u.userId));

      // Notify current user about existing participants
      socket.emit('room-joined', {
        roomId,
        userId,
        socketId: socket.id,
        participants: roomUsersList,
        participantCount: roomUsersList.length + 1,
        message: 'Joined room successfully'
      });

      // Notify others about new user
      socket.to(roomId).emit('user-joined', {
        userId,
        socketId: socket.id,
        userInfo: userInfo || { userId, role: 'student' },
        roomId,
        timestamp: new Date()
      });

      console.log(`[SOCKET] ${userId} joined room ${roomId}. Total users: ${roomUsersList.length + 1}`);
    });

    socket.on('leave-room', (data) => {
      const { roomId, userId } = data;

      console.log(`[SOCKET] ${userId} leaving room: ${roomId}`);

      socket.leave(roomId);
      removeUserFromRoom(roomId, userId);
      socketToRoom.delete(socket.id);

      // Notify others
      socket.to(roomId).emit('user-left', {
        userId,
        roomId,
        timestamp: new Date()
      });

      console.log(`[SOCKET] ${userId} left room ${roomId}`);
    });

    // =====================================================
    // WEBRTC SIGNALING
    // =====================================================

    // Handle WebRTC Offer
    socket.on('offer', (payload) => {
      const { targetUserId, targetSocketId, offer, userId } = payload;

      if (!targetUserId || !offer) {
        console.error('[SOCKET] Invalid offer payload');
        return;
      }

      console.log(`[WEBRTC] Relaying offer from ${userId} to ${targetUserId}`);

      // Find target socket
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) {
        console.error('[WEBRTC] Room not found for offer');
        return;
      }

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('offer', {
          from: userId,
          fromSocketId: socket.id,
          offer,
          timestamp: new Date()
        });
      } else {
        console.error(`[WEBRTC] Target user ${targetUserId} not found in room`);
      }
    });

    // Handle WebRTC Answer
    socket.on('answer', (payload) => {
      const { targetUserId, targetSocketId, answer, userId } = payload;

      if (!targetUserId || !answer) {
        console.error('[SOCKET] Invalid answer payload');
        return;
      }

      console.log(`[WEBRTC] Relaying answer from ${userId} to ${targetUserId}`);

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('answer', {
          from: userId,
          fromSocketId: socket.id,
          answer,
          timestamp: new Date()
        });
      }
    });

    // Handle ICE Candidates
    socket.on('ice-candidate', (payload) => {
      const { targetUserId, targetSocketId, candidate, userId } = payload;

      if (!targetUserId || !candidate) {
        console.error('[SOCKET] Invalid ICE candidate payload');
        return;
      }

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const users = getRoomUsers(roomId);
      const targetUser = users.get(targetUserId);

      if (targetUser) {
        io.to(targetUser.socketId).emit('ice-candidate', {
          from: userId,
          fromSocketId: socket.id,
          candidate,
          timestamp: new Date()
        });
      }
    });

    // =====================================================
    // ATTENDANCE REQUEST SYSTEM
    // =====================================================

    socket.on('attendance-request', (data) => {
      const { studentId, studentName, roomId, timestamp } = data;

      if (!studentId || !roomId) {
        console.error('[ATTENDANCE] Invalid request data');
        socket.emit('attendance-error', { message: 'Invalid request data' });
        return;
      }

      console.log(`[ATTENDANCE] Request from ${studentName} (${studentId}) in room ${roomId}`);

      // Store request
      const requestId = `req_${Date.now()}_${studentId}`;
      const request = {
        id: requestId,
        studentId,
        studentName,
        timestamp,
        status: 'pending'
      };

      if (!attendanceRequests.has(roomId)) {
        attendanceRequests.set(roomId, []);
      }
      attendanceRequests.get(roomId).push(request);

      // Notify host(s) in the room
      socket.to(roomId).emit('attendance-request-received', {
        requestId,
        studentId,
        studentName,
        timestamp,
        roomId
      });

      // Confirm to student
      socket.emit('attendance-confirmation', {
        requestId,
        message: 'Request sent to host'
      });

      console.log(`[ATTENDANCE] Request ${requestId} stored and broadcast to room ${roomId}`);
    });

    socket.on('attendance-response', (data) => {
      const { requestId, studentId, roomId, accepted, timestamp } = data;

      console.log(`[ATTENDANCE] Response for ${studentId}: ${accepted ? 'ACCEPTED' : 'REJECTED'}`);

      // Find and update request
      const requests = attendanceRequests.get(roomId) || [];
      const requestIndex = requests.findIndex(r => r.id === requestId);

      if (requestIndex !== -1) {
        requests[requestIndex].status = accepted ? 'accepted' : 'rejected';
      }

      // Get room users to find student socket
      const roomUsers = getRoomUsers(roomId);
      const studentData = roomUsers.get(studentId);

      if (studentData) {
        // Send directly to student
        io.to(studentData.socketId).emit('attendance-response', {
          requestId,
          studentId,
          accepted,
          message: accepted ? 'Your attendance was accepted' : 'Your attendance was rejected',
          timestamp
        });
        console.log(`[ATTENDANCE] Response sent directly to student ${studentId} at socket ${studentData.socketId}`);
      } else {
        // Fallback: broadcast to room
        socket.to(roomId).emit('attendance-response', {
          requestId,
          studentId,
          accepted,
          message: accepted ? 'Your attendance was accepted' : 'Your attendance was rejected',
          timestamp
        });
        console.log(`[ATTENDANCE] Response broadcast to room ${roomId}`);
      }
    });

    // =====================================================
    // DISCONNECT HANDLING
    // =====================================================

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] User disconnected: ${socket.id}, reason: ${reason}`);

      const removed = removeSocketFromRoom(socket.id);
      if (removed) {
        const { roomId, userId } = removed;

        // Notify others in room
        socket.to(roomId).emit('user-left', {
          userId,
          roomId,
          timestamp: new Date(),
          reason: 'disconnect'
        });

        console.log(`[SOCKET] Cleaned up ${userId} from room ${roomId}`);
      }
    });
  });

  return io;
}

module.exports = { initSocketIO };
