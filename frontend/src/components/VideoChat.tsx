import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Users, Crown } from 'lucide-react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { getSocketUrl } from '../config';
import type { Session, User } from '../types';

// =====================================================
// TYPES
// =====================================================
interface VideoChatProps {
  user: User;
  session: Session;
  onLogout: () => void;
  onLeave: () => void;
}

interface Participant {
  userId: string;
  socketId: string;
  userInfo: {
    name?: string;
    role?: string;
  };
  stream?: MediaStream | null;
}

// =====================================================
// VIDEO TILE COMPONENT - Memoized to prevent re-renders
// =====================================================
interface VideoTileProps {
  stream: MediaStream | null;
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

  // CRITICAL: Only set srcObject once when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`[VIDEO] Setting stream for ${name} (${userId})`);
      videoRef.current.srcObject = stream;
    }
  }, [stream, userId, name]);

  return (
    <motion.div
      layoutId={`video-${userId}`}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gray-900 cursor-pointer transition-all duration-300 ${
        isMainView
          ? 'w-full h-full shadow-2xl'
          : 'w-full h-32 hover:scale-105 hover:ring-4 hover:ring-purple-500/50 shadow-lg'
      }`}
      whileHover={!isMainView ? { scale: 1.05 } : undefined}
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
// MAIN VIDEO CHAT COMPONENT
// =====================================================
const VideoChat: React.FC<VideoChatProps> = ({ user, session, onLogout, onLeave }) => {
  // =====================================================
  // REFS - Stable references that don't cause re-renders
  // =====================================================
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const hasJoinedRef = useRef(false);
  const isConnectingRef = useRef(false);

  // =====================================================
  // STATE - Only what needs to trigger re-renders
  // =====================================================
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  const isHost = user.role === 'host' || user.role === 'instructor';
  const roomId = session?.roomId || session?._id;

  // =====================================================
  // GET USER MEDIA - ONLY ONCE
  // =====================================================
  useEffect(() => {
    console.log('[INIT] Getting user media...');
    let mounted = true;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('[INIT] Got local stream');
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        setConnectionStatus('Camera ready');
      } catch (err: any) {
        console.error('[INIT] getUserMedia error:', err);
        toast.error(`Camera access failed: ${err.message}`);
        setConnectionStatus('Camera failed');
      }
    };

    initMedia();

    // Cleanup function - ONLY runs on unmount
    return () => {
      console.log('[CLEANUP] Stopping all tracks');
      mounted = false;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    };
  }, []); // EMPTY DEPENDENCY ARRAY = run once only

  // =====================================================
  // SOCKET CONNECTION - ONLY ONCE
  // =====================================================
  useEffect(() => {
    if (socketRef.current) return; // Prevent double initialization

    console.log('[SOCKET] Initializing connection...');
    const socket = io(getSocketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token: localStorage.getItem('token') }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      setConnectionStatus('Connected to server');

      // Auto-join room if we have the session
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

    return () => {
      console.log('[CLEANUP] Disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // EMPTY DEPENDENCY ARRAY = run once only

  // =====================================================
  // WEBRTC PEER CONNECTION MANAGEMENT
  // =====================================================
  const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string): RTCPeerConnection => {
    // CRITICAL: Check if peer already exists - prevent duplicates
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

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`[WEBRTC] Received remote stream from ${targetUserId}`);
      const [remoteStream] = event.streams;

      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(targetUserId);
        if (participant) {
          updated.set(targetUserId, { ...participant, stream: remoteStream });
        }
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetUserId,
          candidate: event.candidate,
          userId: user._id
        });
      }
    };

    // Connection state logging
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
  // WEBRTC SIGNALING HANDLERS
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
    setIsJoined(true);
    setConnectionStatus('In meeting');

    // Initiate calls to existing participants
    if (data.participants) {
      data.participants.forEach((participant: any) => {
        // Add to participants map first
        setParticipants(prev => {
          const updated = new Map(prev);
          updated.set(participant.userId, {
            userId: participant.userId,
            socketId: participant.socketId,
            userInfo: participant.userInfo,
            stream: undefined
          });
          return updated;
        });

        // Then initiate call
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

    // If focused user left, clear selection
    setSelectedUserId(prev => prev === userId ? null : prev);
  }, [removePeer]);

  // =====================================================
  // JOIN ROOM FUNCTION
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

  // =====================================================
  // LEAVE ROOM FUNCTION
  // =====================================================
  const leaveRoom = useCallback(() => {
    console.log('[ROOM] Leaving room');

    // Close all peer connections
    peersRef.current.forEach((pc, userId) => {
      pc.close();
      console.log(`[WEBRTC] Closed connection with ${userId}`);
    });
    peersRef.current.clear();

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
    setIsJoined(false);

    onLeave();
  }, [roomId, user._id, onLeave]);

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
  // DERIVED STATE FOR UI
  // =====================================================
  const allParticipants = React.useMemo(() => {
    const list: Array<{
      userId: string;
      socketId: string;
      stream?: MediaStream | null;
      isLocal: boolean;
      isHost: boolean;
      name: string;
    }> = [];

    // Add self
    list.push({
      userId: user._id,
      socketId: 'local',
      stream: localStream,
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

  // Determine main and grid videos (Zoom-like layout)
  const mainParticipant = React.useMemo(() => {
    if (selectedUserId) {
      return allParticipants.find(p => p.userId === selectedUserId) || allParticipants[0];
    }
    // Default: show first non-local participant or self if alone
    const remote = allParticipants.find(p => !p.isLocal);
    return remote || allParticipants[0];
  }, [allParticipants, selectedUserId]);

  const gridParticipants = React.useMemo(() => {
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">{allParticipants.length}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Large Main Video */}
        <div className="flex-1 min-h-0">
          <div className="h-full rounded-2xl overflow-hidden bg-gray-900">
            {mainParticipant && (
              <VideoTile
                key={mainParticipant.userId}
                stream={mainParticipant.stream || null}
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
                stream={participant.stream || null}
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
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
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
            {isVideoOff ? (
              <CameraOff className="w-6 h-6 text-white" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* Leave Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={leaveRoom}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </footer>

      {/* Hidden local video for self-view if needed */}
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
