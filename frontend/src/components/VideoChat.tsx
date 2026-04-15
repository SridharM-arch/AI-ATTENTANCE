import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Users, Crown, CheckCircle, XCircle, Bell } from 'lucide-react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { getSocketUrl, getBackendUrl } from '../config';
import type { Session, User } from '../types';
import axios from 'axios';

// TYPES
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

// VIDEO TILE COMPONENT
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn(`Video play failed for ${name}:`, err);
      });
    }
  }, [stream, name]);

  return (
    <motion.div
      layoutId={`video-${userId}`}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gray-900 cursor-pointer ${
        isMainView ? 'w-full h-full' : 'w-full h-28 hover:scale-105'
      }`}
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-2">
            <span className="text-3xl">👤</span>
          </div>
          <span className="text-gray-400 text-sm">Connecting...</span>
        </div>
      )}

      <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-lg ${
        isHost ? 'bg-yellow-500 text-black' : 'bg-black/60 text-white'
      }`}>
        <span className="text-sm font-semibold">
          {name} {isLocal && '(You)'}
          {isHost && <Crown className="w-3 h-3 inline ml-1" />}
        </span>
      </div>
    </motion.div>
  );
});

VideoTile.displayName = 'VideoTile';

// ATTENDANCE MODAL
const AttendanceModal: React.FC<{
  request: AttendanceRequestData | null;
  onAccept: (requestId: string, studentId: string) => void;
  onReject: (requestId: string, studentId: string) => void;
}> = ({ request, onAccept, onReject }) => {
  if (!request) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
    >
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Attendance Request</h3>
            <p className="text-gray-400">{new Date(request.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>

        <p className="text-white text-lg mb-6">
          <span className="font-semibold text-blue-400">{request.studentName}</span> requested attendance
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => onAccept(request.id, request.studentId)}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Accept
          </button>

          <button
            onClick={() => onReject(request.id, request.studentId)}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// MAIN VIDEO CHAT COMPONENT
const VideoChat: React.FC<VideoChatProps> = ({ user, session, onLogout }) => {
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const hasJoinedRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<AttendanceRequestData | null>(null);
  const [hasRequestedAttendance, setHasRequestedAttendance] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isHost = user.role === 'host' || user.role === 'instructor';
  const roomId = session?.roomId || session?._id;

  // STEP 1: GET USER MEDIA
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
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

        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err: any) {
        toast.error(`Camera/Mic access failed: ${err.message}`);
      }
    };

    initMedia();

    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // STEP 2: SOCKET CONNECTION
  useEffect(() => {
    if (socketRef.current) return;

    const token = localStorage.getItem('token');
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (roomId && !hasJoinedRef.current) {
        joinRoom();
      }
    });

    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('attendance-request-received', handleAttendanceRequest);
    socket.on('attendance-response', handleAttendanceResponse);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // STEP 3: CREATE PEER CONNECTION
  const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string): RTCPeerConnection => {
    if (peersRef.current.has(targetUserId)) {
      return peersRef.current.get(targetUserId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        setParticipants(prev => {
          const updated = new Map(prev);
          const existing = updated.get(targetUserId);
          if (existing) {
            updated.set(targetUserId, { ...existing, stream: remoteStream });
          } else {
            updated.set(targetUserId, {
              userId: targetUserId,
              socketId: targetSocketId,
              userInfo: { name: 'User' },
              stream: remoteStream
            });
          }
          return updated;
        });
      }
    };

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

    peersRef.current.set(targetUserId, pc);
    return pc;
  }, [user._id]);

  // STEP 4: WEBRTC SIGNALING
  const initiateCall = useCallback(async (targetUserId: string, targetSocketId: string) => {
    try {
      const pc = createPeerConnection(targetUserId, targetSocketId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('offer', {
        targetUserId,
        targetSocketId,
        offer,
        userId: user._id
      });
    } catch (error) {
      console.error('Error initiating call:', error);
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
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, user._id]);

  const handleAnswer = useCallback(async (data: any) => {
    const { from, answer } = data;
    try {
      const pc = peersRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
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
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  // STEP 5: ROOM HANDLERS
  const handleRoomJoined = useCallback((data: any) => {
    hasJoinedRef.current = true;
    if (data.participants) {
      data.participants.forEach((p: any) => {
        setTimeout(() => initiateCall(p.userId, p.socketId), 500);
      });
    }
  }, [initiateCall]);

  const handleUserJoined = useCallback((data: any) => {
    const { userId, socketId, userInfo } = data;
    setParticipants(prev => {
      const updated = new Map(prev);
      updated.set(userId, { userId, socketId, userInfo, stream: undefined });
      return updated;
    });
    setTimeout(() => initiateCall(userId, socketId), 500);
  }, [initiateCall]);

  const handleUserLeft = useCallback((data: any) => {
    const { userId } = data;
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
    setParticipants(prev => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
  }, []);

  // STEP 6: JOIN ROOM
  const joinRoom = useCallback(() => {
    if (!socketRef.current || !roomId || hasJoinedRef.current) return;
    socketRef.current.emit('join-room', {
      roomId,
      userId: user._id,
      userInfo: { name: user.name, role: user.role }
    });
  }, [roomId, user._id, user.name, user.role]);

  // STEP 7: LEAVE ROOM
  const leaveRoom = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', { roomId, userId: user._id });
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    setParticipants(new Map());
    hasJoinedRef.current = false;
    onLogout();
  }, [roomId, user._id, onLogout]);

  // STEP 8: ATTENDANCE
  const handleAttendanceRequest = useCallback((data: any) => {
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
    if (data.studentId === user._id) {
      toast.success(data.accepted ? 'Attendance accepted!' : 'Attendance rejected');
      setHasRequestedAttendance(false);
    }
  }, [user._id]);

  const requestAttendance = useCallback(() => {
    if (hasRequestedAttendance) return;
    socketRef.current?.emit('attendance-request', {
      studentId: user._id,
      studentName: user.name,
      roomId,
      timestamp: Date.now()
    });
    setHasRequestedAttendance(true);
    toast.success('Request sent');
  }, [hasRequestedAttendance, user._id, user.name, roomId]);

  const acceptAttendance = useCallback(async (requestId: string, studentId: string) => {
    try {
      await axios.post(`${getBackendUrl()}/api/attendance/mark`, {
        sessionId: session._id,
        studentId,
        status: 'present'
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      socketRef.current?.emit('attendance-response', {
        requestId, studentId, roomId, accepted: true, timestamp: Date.now()
      });
      toast.success('Attendance marked');
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
    setPendingRequest(null);
  }, [roomId, session._id]);

  const rejectAttendance = useCallback((requestId: string, studentId: string) => {
    socketRef.current?.emit('attendance-response', {
      requestId, studentId, roomId, accepted: false, timestamp: Date.now()
    });
    toast.success('Request rejected');
    setPendingRequest(null);
  }, [roomId]);

  // STEP 9: MEDIA CONTROLS
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // STEP 10: DERIVED STATE
  const allParticipants = useMemo(() => {
    const list: Array<{ userId: string; socketId: string; stream?: MediaStream; isLocal: boolean; isHost: boolean; name: string }> = [];

    list.push({
      userId: user._id,
      socketId: 'local',
      stream: localStream || undefined,
      isLocal: true,
      isHost,
      name: user.name || 'You'
    });

    participants.forEach((p, userId) => {
      if (userId !== user._id) {
        list.push({
          userId,
          socketId: p.socketId,
          stream: p.stream,
          isLocal: false,
          isHost: p.userInfo?.role === 'host',
          name: p.userInfo?.name || 'User'
        });
      }
    });

    return list;
  }, [participants, localStream, user._id, user.name, isHost]);

  const mainParticipant = useMemo(() => {
    if (selectedUserId) {
      return allParticipants.find(p => p.userId === selectedUserId) || allParticipants[0];
    }
    const remote = allParticipants.find(p => !p.isLocal);
    return remote || allParticipants[0];
  }, [allParticipants, selectedUserId]);

  const gridParticipants = useMemo(() => {
    return allParticipants.filter(p => p.userId !== mainParticipant?.userId);
  }, [allParticipants, mainParticipant]);

  // RENDER
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Modals */}
      <AnimatePresence>
        {pendingRequest && (
          <AttendanceModal request={pendingRequest} onAccept={acceptAttendance} onReject={rejectAttendance} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Leave Meeting?</h3>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 bg-gray-700 text-white rounded-xl">Cancel</button>
                <button onClick={leaveRoom} className="flex-1 py-3 bg-red-500 text-white rounded-xl">Leave</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{session?.title || 'Meeting'}</h1>
            <p className="text-gray-400 text-sm">Room: {roomId} | {allParticipants.length} users</p>
          </div>
          <div className="flex items-center gap-3">
            {!isHost && !hasRequestedAttendance && (
              <button onClick={requestAttendance} className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2">
                <Bell className="w-4 h-4" /> Request Attendance
              </button>
            )}
            {!isHost && hasRequestedAttendance && (
              <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg">Request sent</span>
            )}
            <button onClick={() => setShowLeaveConfirm(true)} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg">Leave</button>
          </div>
        </div>
      </header>

      {/* Main Video Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
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

        <div className="lg:w-64 flex lg:flex-col gap-3">
          {gridParticipants.map((p) => (
            <div key={p.userId} className="flex-shrink-0 w-40 lg:w-full">
              <VideoTile
                stream={p.stream}
                userId={p.userId}
                isLocal={p.isLocal}
                isHost={p.isHost}
                name={p.name}
                onClick={() => setSelectedUserId(p.userId)}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Controls */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}>
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'}`}>
            {isVideoOff ? <CameraOff className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
          </button>

          <button onClick={() => setShowLeaveConfirm(true)} className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VideoChat;
