import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, X, BarChart3, UserX, Info, CheckCircle, LogOut, Settings } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';
import { PendingRequests } from './PendingRequests';
import { ParticipantsGrid } from './ParticipantsGrid';
import { FaceDetectionOverlay } from './FaceDetectionOverlay';
import { AttendanceProgressBar } from './AttendanceProgressBar';
import { getSocketUrl, getAIServiceUrl, getBackendUrl } from '../config';
import type { Session, User } from '../types';

interface AttendanceRequest {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  timestamp: string;
  status: string;
}

const VideoChat: React.FC<{ user: User; session: Session; onLogout: () => void }> = ({
  user,
  session,
  onLogout
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{ [id: string]: Peer.Instance }>({});
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [attendance, setAttendance] = useState<{ [userId: string]: boolean }>({});
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [finalAttendance, setFinalAttendance] = useState<{ presentTime: number; status: string } | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sent' | 'approved' | 'rejected'>('idle');
  const [requesting, setRequesting] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(1);
  const [sessionRemaining, setSessionRemaining] = useState<number | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; sender: string }>>([]);
  const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalParticipants: number;
    activeParticipants: number;
    avgAttendance: number;
    sessionDuration: number | null;
    activeNow: boolean;
  }>({
    totalParticipants: 0,
    activeParticipants: 0,
    avgAttendance: 0,
    sessionDuration: null,
    activeNow: false
  });
  // Attendance metrics for progress bar
  const [presentTime, setPresentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const participantsPresent = 0; // Static value - not updated dynamically
  const [faceDetectionState, setFaceDetectionState] = useState<'detected' | 'processing' | 'not-detected'>('not-detected');
  const [faceCount, setFaceCount] = useState(0);

  const myVideo = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peersRef = useRef<{ [id: string]: any }>({});

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading session...</p>
        </div>
      </div>
    );
  }

  const fetchAnalytics = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`${getBackendUrl()}/api/sessions/${session._id}/analytics`, config);
      setAnalytics(res.data);
    } catch {
      console.error('Failed to fetch analytics');
    }
  };

  const formatRemainingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSessionEnded = async () => {
    setSessionEnded(true);
    setStatusMessage('The session has ended. Fetching final attendance...');
    await fetchFinalAttendance();
    leaveRoom();
    toast.success('Session has ended');
  };

  const createPeer = (userToSignal: string, callerID: string, currentStream: MediaStream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });
    peer.on('signal', (signal: Peer.SignalData) => {
      socketRef.current.emit('sending-signal', { userToSignal, callerID, signal });
    });
    return peer;
  };

  const addPeer = (incomingSignal: Peer.SignalData, callerID: string, currentStream: MediaStream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
    peer.on('signal', (signal: Peer.SignalData) => {
      socketRef.current.emit('returning-signal', { signal, callerID });
    });
    peer.signal(incomingSignal);
    return peer;
  };

  useEffect(() => {
    const socketUrl = getSocketUrl();
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      setStatusMessage('Connection error - trying to reconnect...');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (session && session._id) {
      fetchAnalytics();
    }
  }, [session]);

  const joinRoomById = async (targetRoomId: string) => {
    if (!targetRoomId) return;

    try {
// Step 1: Check session (PUBLIC)
const res = await axios.get(
  `${getBackendUrl()}/api/sessions/public/join/${targetRoomId}`
);

// Step 2: Join session (PRIVATE with token)
const config = { 
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
};

const response = await axios.post(
  `${getBackendUrl()}/api/sessions/${res.data.sessionId}/join`,
  {},
  config
);
      console.log('Join session response:', response.data);

      socketRef.current.emit('join-room', targetRoomId, user._id);
      
      // If user is host or instructor, join the host room to receive requests
      if (user.role === 'host' || user.role === 'instructor') {
        getHostPendingRequests();
      }
      
      setJoined(true);
      setParticipantsCount((session.participants?.length || 0) + 1);
      fetchRequestStatus();
      toast.success('Joined the meeting');
    } catch (error: any) {
      console.error('Failed to join session:', error);

      let errorMsg = 'Failed to join session';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg);
    }
  };

  const joinRoom = () => {
    joinRoomById(roomId);
  };

  const leaveRoom = () => {
    socketRef.current.emit('leave-room', roomId, user._id);
    setJoined(false);
    setRoomId('');
    setPeers({});
    peersRef.current = {};
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const endSession = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`${getBackendUrl()}/api/sessions/${session._id}/end`, {}, config);

      await fetchFinalAttendance();
      toast.success('Session ended successfully');
      leaveRoom();
    } catch {
      toast.error('Failed to end session');
    }
  };

  const fetchFinalAttendance = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`${getBackendUrl()}/api/attendance/${session._id}`, config);
      const userAttendance = res.data.attendances.find((att: any) => att.studentId === user._id);
      if (userAttendance) {
        setFinalAttendance({
          presentTime: userAttendance.presentTime,
          status: userAttendance.status
        });
      }
    } catch (error) {
      console.error('Failed to fetch final attendance:', error);
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: camOn, audio: micOn })
      .then((media) => {
        setStream(media);
        if (myVideo.current) myVideo.current.srcObject = media;
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        toast.error('Camera/microphone access denied or unavailable.');
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camOn, micOn]);

  useEffect(() => {
    socketRef.current.on('connect', () => {
      console.log('Connected to socket');
    });

    socketRef.current.on('user-joined', (userId: string) => {
      setParticipantsCount((count) => count + 1);
      if (!stream || peersRef.current[userId]) return;
      const peer = createPeer(userId, user._id, stream);
      peersRef.current[userId] = peer;
      setPeers((prev) => ({ ...prev, [userId]: peer }));
    });

    socketRef.current.on('receiving-signal', ({ from, signal }: { from: string; signal: Peer.SignalData }) => {
      if (!stream) return;
      const peer = addPeer(signal, from, stream);
      peersRef.current[from] = peer;
      setPeers((prev) => ({ ...prev, [from]: peer }));
    });

    socketRef.current.on('receiving-returned-signal', ({ id, signal }: { id: string; signal: Peer.SignalData }) => {
      peersRef.current[id]?.signal(signal);
    });

    socketRef.current.on('user-left', (id: string) => {
      peersRef.current[id]?.destroy();
      delete peersRef.current[id];
      setParticipantsCount((count) => Math.max(1, count - 1));
      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    socketRef.current.on('attendance-update', (data: { userId: string; present: boolean; presentTime?: number }) => {
      setAttendance((prev) => ({ ...prev, [data.userId]: data.present }));
      if (data.userId === user._id && data.presentTime !== undefined) {
        setStatusMessage(`Present for ${Math.round(data.presentTime)}s`);
      }
    });

    socketRef.current.on('attendance-request', () => {
      if (user.role === 'instructor') {
        setStatusMessage('New attendance request received');
      }
    });

    socketRef.current.on('attendance-request-status', (data: any) => {
      if (data.studentId === user._id) {
        setRequestStatus(data.status);
        setStatusMessage(`Request ${data.status}`);
      }
    });

    socketRef.current.on('reaction', (reaction: { id: string; emoji: string; sender: string }) => {
      setReactions((prev) => [...prev, reaction]);
      window.setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== reaction.id));
      }, 3200);
    });

    socketRef.current.on('session-ended', (data: { sessionId: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      handleSessionEnded();
    });

    /* ============ REAL-TIME ATTENDANCE REQUEST EVENTS ============ */

    // Student receives notification when their request is approved
    socketRef.current.on('attendance_approved', (data: { studentId: string; message: string; timestamp: string }) => {
      if (data.studentId === user._id) {
        setRequestStatus('approved');
        setStatusMessage('✅ Your attendance was approved!');
        toast.success(data.message);
      }
    });

    // Student receives notification when their request is rejected
    socketRef.current.on('attendance_rejected', (data: { studentId: string; message: string; timestamp: string }) => {
      if (data.studentId === user._id) {
        setRequestStatus('rejected');
        setStatusMessage('❌ Your request was rejected');
        toast.error(data.message);
      }
    });

    // Host receives new attendance requests
    socketRef.current.on('new_attendance_request', (data: { request: AttendanceRequest; totalPending: number }) => {
      if (user.role === 'host' || user.role === 'instructor') {
        setPendingRequests((prev) => [...prev, data.request]);
        toast(`📋 New attendance request from ${data.request.studentName}`);
      }
    });

    // Get list of pending requests
    socketRef.current.on('pending_requests', (data: { requests: AttendanceRequest[]; total: number }) => {
      setPendingRequests(data.requests);
    });

    // Request error handling
    socketRef.current.on('request_error', (data: { error: string }) => {
      toast.error(data.error);
    });

    // Request sent confirmation
    socketRef.current.on('request_sent', (data: { requestId: string; message: string }) => {
      setRequestStatus('sent');
      setStatusMessage(data.message);
    });

    // Authorization response from host
    socketRef.current.on('request_approved', (data: { studentId: string; studentName: string; requestId: string; timestamp: string }) => {
      // Remove approved request from list
      setPendingRequests((prev) => prev.filter(r => r.id !== data.requestId));
    });

    // Rejection response from host
    socketRef.current.on('request_rejected', (data: { studentId: string; studentName: string; requestId: string; reason: string; timestamp: string }) => {
      // Remove rejected request from list
      setPendingRequests((prev) => prev.filter(r => r.id !== data.requestId));
    });

    /* ============ END REAL-TIME EVENTS ============ */

    return () => {
      socketRef.current.off();
    };
  }, [stream, user.role, user._id, roomId]);

  const captureAndSendFrame = async () => {
    if (!myVideo.current || !user._id) return;
    if (myVideo.current.videoWidth === 0) return;

    // Update total time every capture interval
    setTotalTime((prev) => prev + 10);

    const canvas = document.createElement('canvas');
    canvas.width = myVideo.current.videoWidth;
    canvas.height = myVideo.current.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(myVideo.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      try {
        setFaceDetectionState('processing');
        const { data } = await axios.post(`${getAIServiceUrl()}/recognize`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (data.success && data.recognized_users && data.recognized_users.length > 0) {
          setFaceCount(data.recognized_users.length);
          setFaceDetectionState('detected');
          
          // Check if current user is recognized
          if (data.recognized_users.includes(user._id)) {
            // Update present time
            setPresentTime((prev) => prev + 10);
            
            // Update attendance in backend
            await axios.post(`${getBackendUrl()}/api/attendance/update`, {
              studentId: user._id,
              sessionId: session._id,
              timeIncrement: 10
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setStatusMessage('✅ Face detected - Tracking attendance');
          } else {
            setStatusMessage('❌ Face not recognized - Please ensure good lighting and positioning');
          }
        } else {
          setFaceCount(0);
          setFaceDetectionState('not-detected');
          setStatusMessage('❌ No face detected - Please face the camera');
        }
      } catch (error) {
        console.log('Face recognition error:', error);
        setFaceDetectionState('not-detected');
        setStatusMessage('Face recognition service unavailable');
      }
    }, 'image/jpeg', 0.8);
  };

  const emitReaction = (emoji: string) => {
    if (!joined || !roomId) return;
    socketRef.current.emit('reaction', {
      roomId,
      emoji,
      sender: user.name
    });
  };

  const requestAttendance = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      socketRef.current.emit('send_attendance_request', {
        studentId: user._id,
        studentName: user.name || 'Unknown Student',
        sessionId: session._id
      });
      // Response will come via socket events
    } catch (error: any) {
      console.error('Request attendance error:', error);
      setStatusMessage('Failed to send attendance request');
      toast.error('Failed to send attendance request');
    } finally {
      setRequesting(false);
    }
  };

  const approveAttendanceRequest = (requestId: string, studentId: string) => {
    socketRef.current.emit('approve_attendance_request', {
      requestId,
      studentId,
      sessionId: session._id
    });
  };

  const rejectAttendanceRequest = (requestId: string, studentId: string) => {
    socketRef.current.emit('reject_attendance_request', {
      requestId,
      studentId,
      sessionId: session._id,
      reason: 'Request was rejected by host'
    });
  };

  const getHostPendingRequests = () => {
    socketRef.current.emit('join_session_as_host', session._id);
  };

  const fetchRequestStatus = async () => {
    try {
      const res = await axios.get(`${getBackendUrl()}/api/attendance/requests/${session._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const myRequest = res.data.requests.find((r: any) => r.studentId === user._id);
      if (myRequest) {
        setRequestStatus(myRequest.status);
      }
    } catch (error) {
      console.error('Fetch request status error:', error);
    }
  };

  useEffect(() => {
    if (!stream || !roomId || !joined || sessionEnded) return;
    const id = setInterval(captureAndSendFrame, 10000); // Every 10 seconds
    return () => clearInterval(id);
  }, [stream, roomId, joined, sessionEnded]);

  useEffect(() => {
    if (session && session.endTime) {
      const endMs = new Date(session.endTime).getTime();

      const updateRemaining = () => {
        const remainingSeconds = Math.max(Math.ceil((endMs - Date.now()) / 1000), 0);
        setSessionRemaining(remainingSeconds);
        if (remainingSeconds === 0 && !sessionEnded) {
          handleSessionEnded();
        }
      };

      updateRemaining();
      const timer = window.setInterval(updateRemaining, 1000);
      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [session.endTime, sessionEnded]);

  useEffect(() => {
    if (session && session.roomId && !sessionEnded) {
      setRoomId(session.roomId);
      setTimeout(() => joinRoomById(session.roomId), 1000);
    }
  }, [session, sessionEnded]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <AnimatePresence mode="wait">
        {!joined ? (
          <motion.div
            key="join-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 rounded-3xl p-8 shadow-2xl max-w-md w-full"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4"
                >
                  <Camera className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Together</h2>
                <p className="text-gray-300">
                  {sessionEnded || !session.isActive
                    ? 'This session has already ended.'
                    : 'Enter room ID to join your live session.'}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={sessionEnded || !session.isActive}
                  className="w-full px-4 py-3 bg-white/20 dark:bg-white/15 border border-white/40 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed caret-white backdrop-blur-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={joinRoom}
                  disabled={sessionEnded || !session.isActive}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-blue-500/50"
                >
                  Join Meeting
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="meeting-room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen flex flex-col"
          >
            {/* Attendance Progress Bar */}
            <AttendanceProgressBar
              presentTime={presentTime}
              totalTime={totalTime}
              participantsPresent={participantsPresent}
              totalParticipants={Object.keys(peers).length + 1}
              sessionStatus={sessionEnded ? 'ended' : 'active'}
            />

            {/* Pending Requests Panel - For Hosts */}
            {(user.role === 'host' || user.role === 'instructor') && (
              <PendingRequests
                requests={pendingRequests}
                onApprove={approveAttendanceRequest}
                onReject={rejectAttendanceRequest}
              />
            )}

            {/* Video Grid */}
            <div className="flex-1 p-4 bg-gradient-to-br from-slate-900/50 via-purple-900/50 to-slate-900/50 min-h-screen">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
              >
                <ParticipantsGrid
                  myVideo={myVideo}
                  myName={user.name}
                  isHost={user.role === 'host' || user.role === 'instructor'}
                  peers={peers}
                  peerMetadata={{}}
                  micOn={micOn}
                  videoOn={camOn}
                />
              </motion.div>
            </div>

            {/* Face Detection Overlay */}
            <FaceDetectionOverlay
              isDetected={faceDetectionState === 'detected'}
              isProcessing={faceDetectionState === 'processing'}
              faceCount={faceCount}
            />

            {/* Status Messages */}
            <AnimatePresence>
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
                >
                  <div className="backdrop-blur-xl bg-white/20 dark:bg-white/10 border border-white/30 rounded-xl px-6 py-3 shadow-2xl">
                    <p className="text-white font-medium">{statusMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session Ended Message */}
            {sessionEnded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
              >
                <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <X className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">Session Ended</h3>
                  <p className="text-gray-300 mb-4">Attendance has been finalized.</p>
                  {finalAttendance && (
                    <div className="backdrop-blur-md bg-white/10 rounded-xl p-4">
                      <h4 className="text-white font-semibold mb-2">Final Attendance</h4>
                      <p className="text-gray-300">Present Time: {Math.floor(finalAttendance.presentTime / 60)}m {finalAttendance.presentTime % 60}s</p>
                      <p className="text-white font-medium">Status: {finalAttendance.status}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Attendance Request */}
            {joined && finalAttendance?.status !== 'Present' && !sessionEnded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-24 left-4 right-4 z-40"
              >
                <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-white font-semibold mb-4">Manual Attendance Request</h3>
                  {requestStatus === 'idle' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={requestAttendance}
                      disabled={requesting}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg"
                    >
                      {requesting ? 'Sending...' : 'Request Attendance'}
                    </motion.button>
                  )}
                  {requestStatus === 'sent' && <p className="text-yellow-300">⏳ Request Sent - Waiting for approval</p>}
                  {requestStatus === 'approved' && <p className="text-green-300">✅ Request Approved - Attendance Marked</p>}
                  {requestStatus === 'rejected' && <p className="text-red-300">❌ Request Rejected</p>}
                </div>
              </motion.div>
            )}

            {/* Floating Reactions */}
            <div className="fixed inset-0 pointer-events-none z-30">
              <AnimatePresence>
                {reactions.map((reaction) => (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 0, scale: 0, y: 100 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1, 1, 0],
                      y: [100, 0, -100, -200]
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 3.2, ease: "easeOut" }}
                    className="absolute text-4xl"
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      top: `${Math.random() * 60 + 20}%`
                    }}
                  >
                    {reaction.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Controls Bar */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/10 dark:bg-white/5 border-t border-white/20 p-4"
            >
              <div className="flex items-center justify-center space-x-4 max-w-4xl mx-auto">
                {/* Emoji Reactions */}
                <div className="flex space-x-2">
                  {['✋', '❤️', '👏'].map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => emitReaction(emoji)}
                      className="w-12 h-12 backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl flex items-center justify-center text-xl transition-all duration-200 shadow-lg"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>

                <div className="w-px h-8 bg-white/30" />

                {/* Media Controls */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMicOn(!micOn)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 shadow-lg ${
                    micOn
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'backdrop-blur-md bg-red-500/20 border border-red-500/50 text-red-300'
                  }`}
                >
                  {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCamOn(!camOn)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 shadow-lg ${
                    camOn
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'backdrop-blur-md bg-red-500/20 border border-red-500/50 text-red-300'
                  }`}
                >
                  {camOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
                </motion.button>

                <div className="w-px h-8 bg-white/30" />

                {/* Host Controls */}
                {user.role === 'instructor' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPanel(!showPanel)}
                    className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl px-4 py-2 flex items-center space-x-2 text-white font-medium transition-all duration-200 shadow-lg"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Panel</span>
                  </motion.button>
                )}

                {/* Leave Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={leaveRoom}
                  className="backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl px-4 py-2 flex items-center space-x-2 text-red-300 font-medium transition-all duration-200 shadow-lg"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Leave</span>
                </motion.button>

                {/* Logout Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onLogout}
                  className="backdrop-blur-md bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 rounded-xl px-4 py-2 flex items-center space-x-2 text-gray-300 font-medium transition-all duration-200 shadow-lg"
                >
                  <UserX className="w-5 h-5" />
                  <span>Logout</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Side Panel */}
            <AnimatePresence>
              {showPanel && user.role === 'instructor' && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed right-0 top-0 bottom-0 w-80 backdrop-blur-xl bg-white/10 dark:bg-white/5 border-l border-white/20 shadow-2xl z-50"
                >
                  <div className="p-6 h-full overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold">Dashboard</h3>
                          <p className="text-gray-400 text-sm">Session Overview</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowPanel(false)}
                        className="w-8 h-8 backdrop-blur-md bg-white/20 rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="space-y-6">
                      {/* Session Info */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="backdrop-blur-md bg-white/10 rounded-xl p-4"
                      >
                        <h4 className="text-white font-semibold mb-3 flex items-center">
                          <Info className="w-5 h-5 mr-2" />
                          Session Info
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300"><strong>Room:</strong> {roomId}</p>
                          <p className="text-gray-300"><strong>Host:</strong> {user.name}</p>
                          <p className="text-gray-300"><strong>Role:</strong> Host 👑</p>
                          <p className="text-gray-300"><strong>Participants:</strong> {participantsCount}</p>
                          {sessionRemaining !== null && (
                            <p className="text-gray-300"><strong>Time Left:</strong> {formatRemainingTime(sessionRemaining)}</p>
                          )}
                        </div>
                      </motion.div>

                      {/* Analytics */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="backdrop-blur-md bg-white/10 rounded-xl p-4"
                      >
                        <h4 className="text-white font-semibold mb-3 flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Analytics
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300"><strong>Total Participants:</strong> {analytics.totalParticipants}</p>
                          <p className="text-gray-300"><strong>Avg Attendance:</strong> {analytics.avgAttendance}%</p>
                          <p className="text-gray-300"><strong>Session Active:</strong> {analytics.activeNow ? 'Yes' : 'No'}</p>
                        </div>
                      </motion.div>

                      {/* Attendance */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="backdrop-blur-md bg-white/10 rounded-xl p-4"
                      >
                        <h4 className="text-white font-semibold mb-3 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          AI Attendance
                        </h4>
                        <p className="text-gray-400 text-sm mb-3">Real-time face detection tracking</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{user.name}:</span>
                            <span className={`font-medium ${attendance[user._id] ? 'text-green-400' : 'text-red-400'}`}>
                              {attendance[user._id] ? 'Present' : 'Absent'}
                            </span>
                          </div>
                          {Object.entries(attendance)
                            .filter(([id]) => id !== user._id)
                            .map(([id, present]) => (
                              <div key={id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{id}:</span>
                                <span className={`font-medium ${present ? 'text-green-400' : 'text-red-400'}`}>
                                  {present ? 'Present' : 'Absent'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </motion.div>

                      {/* Host Controls */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="backdrop-blur-md bg-white/10 rounded-xl p-4"
                      >
                        <h4 className="text-white font-semibold mb-3 flex items-center">
                          <Settings className="w-5 h-5 mr-2" />
                          Host Controls
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={endSession}
                            className="w-full py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg"
                          >
                            End Session
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-2 backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-white font-medium rounded-lg transition-all duration-200"
                          >
                            Share Meeting Link
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-2 backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-white font-medium rounded-lg transition-all duration-200"
                          >
                            Invite Participants
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-2 backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-white font-medium rounded-lg transition-all duration-200"
                          >
                            Record Session
                          </motion.button>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoChat;
