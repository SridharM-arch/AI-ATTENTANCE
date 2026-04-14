import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Users, Crown, CheckCircle, XCircle, Bell, LogOut } from 'lucide-react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { getSocketUrl, getBackendUrl } from '../config';
import type { Session, User } from '../types';
import axios from 'axios';

// =====================================================
// TYPES
// =====================================================
interface VideoChatProps {
  user: User;
  session: Session;
  onLogout: () => void;
}

interface Participant {
  userId: string;
  socketId: string;
  userInfo: {
    name?: string;
    role?: string;
  };
  stream?: MediaStream;
}

interface AttendanceRequestData {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: number;
}

// =====================================================
// VIDEO TILE COMPONENT - Memoized to prevent re-renders
// =====================================================
interface VideoTileProps {
  stream?: MediaStream;
  userId: string;
  isLocal: boolean;
  isHost: boolean;
  name: string;
  isMainView?: boolean;
  onClick?: () => void;
}

const VideoTile = React.memo<VideoTileProps>(({
  stream,
  userId,
  isLocal,
  isHost,
  name,
  isMainView,
  onClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasStream = !!stream;

  // CRITICAL: Set srcObject when stream changes or component mounts
  useEffect(() => {
    console.log(`[VIDEO] VideoTile effect: ${name}, hasStream: ${hasStream}`);
    if (videoRef.current && stream) {
      console.log(`[VIDEO] ✅ Setting srcObject for ${name}`);
      videoRef.current.srcObject = stream;
      
      // Force play
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn(`[VIDEO] Autoplay failed for ${name}:`, err);
        });
      }
    }
  }, [stream, name, hasStream]);

  return (
    <motion.div
      layoutId={`video-${userId}`}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gray-900 cursor-pointer transition-all duration-300 ${
        isMainView
          ? 'w-full h-full shadow-2xl'
          : 'w-full h-28 hover:scale-105 hover:ring-4 hover:ring-purple-500/50 shadow-lg'
      }`}
      whileHover={!isMainView ? { scale: 1.02 } : undefined}
      whileTap={!isMainView ? { scale: 0.98 } : undefined}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mb-2">
            <span className="text-3xl">👤</span>
          </div>
          <span className="text-gray-400 text-sm">Connecting...</span>
        </div>
      )}

      {/* Name Tag */}
      <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-md ${
        isHost
          ? 'bg-yellow-500/90 text-black'
          : 'bg-black/60 text-white'
      }`}>
        <span className="text-sm font-semibold flex items-center gap-1">
          {name} {isLocal && '(You)'}
          {isHost && <Crown className="w-3 h-3" />}
        </span>
      </div>

      {/* Connection Status */}
      {!stream && (
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        </div>
      )}
    </motion.div>
  );
});

VideoTile.displayName = 'VideoTile';

// =====================================================
// ATTENDANCE REQUEST MODAL
// =====================================================
interface AttendanceModalProps {
  request: AttendanceRequestData | null;
  onAccept: (requestId: string, studentId: string) => void;
  onReject: (requestId: string, studentId: string) => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({ request, onAccept, onReject }) => {
  if (!request) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Attendance Request</h3>
            <p className="text-gray-400 text-sm">{new Date(request.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>

        <p className="text-white text-lg mb-6">
          <span className="font-semibold text-blue-400">{request.studentName}</span> requested attendance
        </p>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAccept(request.id, request.studentId)}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Accept
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onReject(request.id, request.studentId)}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// =====================================================
// MAIN VIDEO CHAT COMPONENT
// =====================================================
const VideoChat: React.FC<VideoChatProps> = ({ user, session, onLogout }) => {
  // =====================================================
  // REFS - Stable references (NO RE-RENDERS)
  // =====================================================
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const hasJoinedRef = useRef(false);
  const isConnectingRef = useRef(false);

  // =====================================================
  // STATE - Only what triggers re-renders
  // =====================================================
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [pendingRequest, setPendingRequest] = useState<AttendanceRequestData | null>(null);
  const [hasRequestedAttendance, setHasRequestedAttendance] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isHost = user.role === 'host' || user.role === 'instructor';
  const roomId = session?.roomId || session?._id;

  // =====================================================
  // GET USER MEDIA - AUDIO + VIDEO - CALLED ONCE
  // =====================================================
  useEffect(() => {
    console.log('[INIT] Getting user media with audio and video...');
    let mounted = true;

    const initMedia = async () => {
      try {
        // CRITICAL: Include both audio and video with proper constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('[INIT] Got local stream with tracks:', 
          stream.getTracks().map(t => `${t.kind} (${t.label})`));
        
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        setConnectionStatus('Camera ready');
      } catch (err: any) {
        console.error('[INIT] getUserMedia error:', err);
        toast.error(`Camera/Mic access failed: ${err.message}`);
        setConnectionStatus('Media failed');
      }
    };

    initMedia();

    return () => {
      console.log('[CLEANUP] Stopping all tracks');
      mounted = false;
      localStreamRef.current?.getTracks().forEach(track => {
        console.log(`[CLEANUP] Stopping track: ${track.kind}`);
        track.stop();
      });
      localStreamRef.current = null;
    };
  }, []); // EMPTY DEPS = run once

  // =====================================================
  // SOCKET CONNECTION - INITIALIZED ONCE
  // =====================================================
  useEffect(() => {
    if (socketRef.current) return; // Prevent double init

    console.log('[SOCKET] Initializing connection...');
    const token = localStorage.getItem('token');
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      setConnectionStatus('Connected to server');
      if (roomId && !hasJoinedRef.current && !isConnectingRef.current) {
        joinRoom();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setConnectionStatus('Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      setConnectionStatus('Connection error');
    });

    // Room events
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    // WebRTC signaling
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    // Attendance events
    socket.on('attendance-request-received', handleAttendanceRequest);
    socket.on('attendance-response', handleAttendanceResponse);
    socket.on('attendance-confirmation', handleAttendanceConfirmation);

    return () => {
      console.log('[CLEANUP] Disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Run once

  // =====================================================
  // WEBRTC PEER CONNECTION
  // =====================================================
  const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string): RTCPeerConnection => {
    // CRITICAL: Prevent duplicate peer connections
    if (peersRef.current.has(targetUserId)) {
      console.log(`[WEBRTC] Peer for ${targetUserId} already exists, reusing`);
      return peersRef.current.get(targetUserId)!;
    }

    console.log(`[WEBRTC] Creating new peer connection for ${targetUserId}`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // CRITICAL: Add ALL local stream tracks (audio + video)
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`[WEBRTC] Adding ${tracks.length} tracks to peer connection for ${targetUserId}`);
      
      tracks.forEach(track => {
        if (localStreamRef.current) {
          console.log(`[WEBRTC] Adding ${track.kind} track to peer`);
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // CRITICAL: Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log(`[WEBRTC] 🎥 ontrack fired for ${targetUserId}!`, event.streams);
      
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log(`[WEBRTC] ✅ Remote stream received from ${targetUserId}:`, 
          remoteStream.getTracks().map(t => t.kind));

        // CRITICAL: Update participant with received stream
        setParticipants(prev => {
          const updated = new Map(prev);
          const participant = updated.get(targetUserId);
          if (participant) {
            console.log(`[WEBRTC] Updating participant ${targetUserId} with stream`);
            updated.set(targetUserId, { ...participant, stream: remoteStream });
          } else {
            console.log(`[WEBRTC] Creating new participant entry for ${targetUserId}`);
            updated.set(targetUserId, {
              userId: targetUserId,
              socketId: targetSocketId,
              userInfo: { name: 'Participant' },
              stream: remoteStream
            });
          }
          return updated;
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetUserId,
          targetSocketId,
          candidate: event.candidate,
          userId: user._id
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WEBRTC] Connection state with ${targetUserId}: ${pc.connectionState}`);
    };

    peersRef.current.set(targetUserId, pc);
    return pc;
  }, [user._id]);

  const removePeer = useCallback((userId: string) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
      console.log(`[WEBRTC] Closed peer connection for ${userId}`);
    }

    setParticipants(prev => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
  }, []);

  // =====================================================
  // WEBRTC SIGNALING
  // =====================================================
  const initiateCall = useCallback(async (targetUserId: string, targetSocketId: string) => {
    try {
      const pc = createPeerConnection(targetUserId, targetSocketId);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      socketRef.current?.emit('offer', {
        targetUserId,
        targetSocketId,
        offer,
        userId: user._id
      });

      console.log(`[WEBRTC] Sent offer to ${targetUserId}`);
    } catch (error) {
      console.error('[WEBRTC] Error initiating call:', error);
    }
  }, [createPeerConnection, user._id]);

  const handleOffer = useCallback(async (data: any) => {
    const { from, fromSocketId, offer } = data;

    try {
      const pc = createPeerConnection(from, fromSocketId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('answer', {
        targetUserId: from,
        targetSocketId: fromSocketId,
        answer,
        userId: user._id
      });

      console.log(`[WEBRTC] Sent answer to ${from}`);
    } catch (error) {
      console.error('[WEBRTC] Error handling offer:', error);
    }
  }, [createPeerConnection, user._id]);

  const handleAnswer = useCallback(async (data: any) => {
    const { from, answer } = data;

    try {
      const pc = peersRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[WEBRTC] Set remote description for ${from}`);
      }
    } catch (error) {
      console.error('[WEBRTC] Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data: any) => {
    const { from, candidate } = data;

    try {
      const pc = peersRef.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('[WEBRTC] Error handling ICE candidate:', error);
    }
  }, []);

  // =====================================================
  // ROOM EVENT HANDLERS
  // =====================================================
  const handleRoomJoined = useCallback((data: any) => {
    console.log('[ROOM] Joined:', data);
    hasJoinedRef.current = true;
    isConnectingRef.current = false;
    setConnectionStatus('In meeting');

    // Initiate calls to existing participants
    if (data.participants) {
      data.participants.forEach((participant: any) => {
        setParticipants(prev => {
          const updated = new Map(prev);
          if (!updated.has(participant.userId)) {
            updated.set(participant.userId, {
              userId: participant.userId,
              socketId: participant.socketId,
              userInfo: participant.userInfo,
              stream: undefined
            });
          }
          return updated;
        });

        // Small delay to ensure peer is created
        setTimeout(() => {
          initiateCall(participant.userId, participant.socketId);
        }, 500);
      });
    }

    toast.success('Joined meeting successfully');
  }, [initiateCall]);

  const handleUserJoined = useCallback((data: any) => {
    console.log('[ROOM] User joined:', data);
    const { userId, socketId, userInfo } = data;

    // Add new participant
    setParticipants(prev => {
      const updated = new Map(prev);
      updated.set(userId, {
        userId,
        socketId,
        userInfo,
        stream: undefined
      });
      return updated;
    });

    toast.success(`${userInfo?.name || 'Someone'} joined`);

    // Initiate call to new user
    setTimeout(() => {
      initiateCall(userId, socketId);
    }, 500);
  }, [initiateCall]);

  const handleUserLeft = useCallback((data: any) => {
    console.log('[ROOM] User left:', data);
    const { userId } = data;

    removePeer(userId);
    toast.success('Someone left the meeting');
    setSelectedUserId(prev => prev === userId ? null : prev);
  }, [removePeer]);

  // =====================================================
  // ATTENDANCE HANDLERS
  // =====================================================
  const handleAttendanceRequest = useCallback((data: any) => {
    console.log('[ATTENDANCE] Request received:', data);
    if (isHost) {
      setPendingRequest({
        id: data.requestId,
        studentId: data.studentId,
        studentName: data.studentName,
        timestamp: data.timestamp
      });
    }
  }, [isHost]);

  const handleAttendanceResponse = useCallback((data: any) => {
    console.log('[ATTENDANCE] Response received:', data);
    if (data.studentId === user._id) {
      if (data.accepted) {
        toast.success('✅ Your attendance request was accepted!');
      } else {
        toast.error('❌ Your attendance request was rejected');
      }
      setHasRequestedAttendance(false);
    }
  }, [user._id]);

  const handleAttendanceConfirmation = useCallback((data: any) => {
    console.log('[ATTENDANCE] Confirmation received:', data);
    setHasRequestedAttendance(true);
  }, []);

  const requestAttendance = useCallback(() => {
    if (hasRequestedAttendance) {
      toast.success('You already requested attendance');
      return;
    }

    console.log('[ATTENDANCE] Sending request...');
    socketRef.current?.emit('attendance-request', {
      studentId: user._id,
      studentName: user.name,
      roomId,
      timestamp: Date.now()
    });

    setHasRequestedAttendance(true);
    toast.success('Attendance request sent to host');
  }, [hasRequestedAttendance, user._id, user.name, roomId]);

  const acceptAttendance = useCallback(async (requestId: string, studentId: string) => {
    console.log('[ATTENDANCE] Accepting request:', requestId);
    
    // Mark attendance in DB
    try {
      await axios.post(`${getBackendUrl()}/api/attendance/mark`, {
        sessionId: session._id,
        studentId,
        status: 'present'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      socketRef.current?.emit('attendance-response', {
        requestId,
        studentId,
        roomId,
        accepted: true,
        timestamp: Date.now()
      });
      
      toast.success(`Attendance accepted for ${pendingRequest?.studentName}`);
    } catch (error) {
      console.error('[ATTENDANCE] Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
    
    setPendingRequest(null);
  }, [roomId, session._id, pendingRequest?.studentName]);

  const rejectAttendance = useCallback((requestId: string, studentId: string) => {
    console.log('[ATTENDANCE] Rejecting request:', requestId);
    socketRef.current?.emit('attendance-response', {
      requestId,
      studentId,
      roomId,
      accepted: false,
      timestamp: Date.now()
    });
    
    toast.success(`Attendance rejected for ${pendingRequest?.studentName}`);
    setPendingRequest(null);
  }, [roomId, pendingRequest?.studentName]);

  // =====================================================
  // JOIN / LEAVE ROOM
  // =====================================================
  const joinRoom = useCallback(() => {
    if (!socketRef.current || !roomId || hasJoinedRef.current || isConnectingRef.current) {
      return;
    }

    console.log(`[ROOM] Joining room: ${roomId}`);
    isConnectingRef.current = true;
    setConnectionStatus('Joining room...');

    socketRef.current.emit('join-room', {
      roomId,
      userId: user._id,
      userInfo: {
        name: user.name,
        role: user.role
      }
    });
  }, [roomId, user._id, user.name, user.role]);

  const leaveRoom = useCallback(() => {
    console.log('[ROOM] Leaving room');

    // Close all peer connections
    peersRef.current.forEach((pc, userId) => {
      pc.close();
      console.log(`[WEBRTC] Closed connection with ${userId}`);
    });
    peersRef.current.clear();

    // Stop local stream
    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
    });
    localStreamRef.current = null;
    setLocalStream(null);

    // Notify server
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', {
        roomId,
        userId: user._id
      });
    }

    // Clear participants
    setParticipants(new Map());
    hasJoinedRef.current = false;
    isConnectingRef.current = false;
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    onLogout();
  }, [roomId, user._id, onLogout]);

  // =====================================================
  // MEDIA CONTROLS
  // =====================================================
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        toast.success(audioTrack.enabled ? 'Microphone on' : 'Microphone off');
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        toast.success(videoTrack.enabled ? 'Camera on' : 'Camera off');
      }
    }
  }, []);

  // =====================================================
  // DERIVED STATE
  // =====================================================
  const allParticipants = useMemo(() => {
    const list: Array<{
      userId: string;
      socketId: string;
      stream?: MediaStream;
      isLocal: boolean;
      isHost: boolean;
      name: string;
    }> = [];

    // Add self
    list.push({
      userId: user._id,
      socketId: 'local',
      stream: localStream || undefined,
      isLocal: true,
      isHost,
      name: user.name || 'You'
    });

    // Add remote participants
    participants.forEach((p, userId) => {
      if (userId !== user._id) {
        list.push({
          userId,
          socketId: p.socketId,
          stream: p.stream,
          isLocal: false,
          isHost: p.userInfo?.role === 'host' || p.userInfo?.role === 'instructor',
          name: p.userInfo?.name || 'Participant'
        });
      }
    });

    return list;
  }, [participants, localStream, user._id, user.name, isHost]);

  // Zoom-like layout: main video + grid
  const mainParticipant = useMemo(() => {
    if (selectedUserId) {
      return allParticipants.find(p => p.userId === selectedUserId) || allParticipants[0];
    }
    // Default: show first non-local participant or self if alone
    const remote = allParticipants.find(p => !p.isLocal);
    return remote || allParticipants[0];
  }, [allParticipants, selectedUserId]);

  const gridParticipants = useMemo(() => {
    return allParticipants.filter(p => p.userId !== mainParticipant?.userId);
  }, [allParticipants, mainParticipant]);

  // =====================================================
  // RENDER
  // =====================================================
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Attendance Modal for Host */}
      <AnimatePresence>
        {pendingRequest && (
          <AttendanceModal
            request={pendingRequest}
            onAccept={acceptAttendance}
            onReject={rejectAttendance}
          />
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Leave Meeting?</h3>
              <p className="text-gray-400 mb-6">Are you sure you want to leave this meeting?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={leaveRoom}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{session.title}</h1>
            <p className="text-gray-400 text-sm">
              Room: {roomId} | {allParticipants.length} participants | {connectionStatus}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Attendance Request Button - Student Only */}
            {!isHost && !hasRequestedAttendance && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={requestAttendance}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Request Attendance
              </motion.button>
            )}

            {!isHost && hasRequestedAttendance && (
              <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm">
                Request sent...
              </span>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">{allParticipants.length}</span>
            </div>
            
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Video Area - Zoom Layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Large Main Video */}
        <div className="flex-1 min-h-0">
          <div className="h-full rounded-2xl overflow-hidden bg-gray-900">
            {mainParticipant && (
              <VideoTile
                key={mainParticipant.userId}
                stream={mainParticipant.stream}
                userId={mainParticipant.userId}
                isLocal={mainParticipant.isLocal}
                isHost={mainParticipant.isHost}
                name={mainParticipant.name}
                isMainView={true}
              />
            )}
          </div>
        </div>

        {/* Side Grid - Small Videos */}
        <div className="lg:w-64 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden">
          {gridParticipants.map((participant) => (
            <div key={participant.userId} className="flex-shrink-0 w-40 lg:w-full">
              <VideoTile
                stream={participant.stream}
                userId={participant.userId}
                isLocal={participant.isLocal}
                isHost={participant.isHost}
                name={participant.name}
                onClick={() => setSelectedUserId(participant.userId)}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Controls Bar */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </motion.button>

          {/* Video Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isVideoOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? <CameraOff className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
          </motion.button>

          {/* Leave Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLeaveConfirm(true)}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </footer>

      {/* Hidden local video ref */}
      <video
        ref={myVideoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
    </div>
  );
};

export default VideoChat;
