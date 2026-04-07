import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import type { Session, User } from '../types';
import './VideoChat.css';

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

  const myVideo = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peersRef = useRef<{ [id: string]: any }>({});

  if (!session) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading session...</div>;
  }

  const fetchAnalytics = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`http://localhost:5000/api/sessions/${session._id}/analytics`, config);
      setAnalytics(res.data);
    } catch {
      console.error('Failed to fetch analytics');
    }
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
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
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
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const response = await axios.post(`http://localhost:5000/api/sessions/${session._id}/join`, {}, config);
      console.log('Join session response:', response.data);
      
      socketRef.current.emit('join-room', targetRoomId, user._id);
      setJoined(true);
    } catch (error: any) {
      console.error('Failed to join session:', error);
      
      // Extract detailed error message from response
      let errorMsg = 'Failed to join session';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(errorMsg);
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
      await axios.post(`http://localhost:5000/api/sessions/${session._id}/end`, {}, config);
      
      // Fetch final attendance
      await fetchFinalAttendance();
      
      alert('Session ended');
      leaveRoom();
    } catch {
      console.error('Failed to end session');
    }
  };

  const fetchFinalAttendance = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`http://localhost:5000/api/attendance/${session._id}`, config);
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
        alert('Camera/microphone access denied or unavailable.');
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

      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    socketRef.current.on('attendance-update', (data: { userId: string; present: boolean }) => {
      setAttendance((prev) => ({ ...prev, [data.userId]: data.present }));
    });

    return () => {
      socketRef.current.off();
    };
  }, [stream]);

  const captureAndSendFrame = async () => {
    if (!myVideo.current || !user._id) return;
    if (myVideo.current.videoWidth === 0) return;

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
        const { data } = await axios.post('http://localhost:8000/recognize', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (data.success && data.recognized_users && data.recognized_users.length > 0) {
          // Check if current user is recognized
          if (data.recognized_users.includes(user._id)) {
            // Update present time using new attendance system
            await axios.post('http://localhost:5000/api/attendance/update', {
              studentId: user._id, // Use user ID as student ID
              sessionId: session._id, // Use session ID
              timeIncrement: 5 // Add 5 seconds
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setStatusMessage('Face detected - Tracking attendance');
          } else {
            setStatusMessage('Face not recognized - Please ensure good lighting and positioning');
          }
        } else {
          setStatusMessage('No face detected - Please face the camera');
        }
      } catch (error) {
        console.log('Face recognition error:', error);
        setStatusMessage('Face recognition service unavailable');
      }
    }, 'image/jpeg', 0.8);
  };

  useEffect(() => {
    if (!stream || !roomId) return;
    const id = setInterval(captureAndSendFrame, 4000); // Every 4 seconds
    return () => clearInterval(id);
  }, [stream, roomId]);

  useEffect(() => {
    if (session && session.roomId) {
      setRoomId(session.roomId);
      setTimeout(() => joinRoomById(session.roomId), 1000);
    }
  }, [session]);

  return (
    <div className="video-chat">
      {!joined ? (
        <div className="join-screen">
          <div className="join-card">
            <div className="logo-small">
              <h2>CT</h2>
              <span>Connect Together</span>
            </div>
            <p className="join-copy">Enter room ID to join your live session.</p>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button className="join-btn" onClick={joinRoom}>
              Join Meeting
            </button>
          </div>
        </div>
      ) : (
        <div className="meeting-room">
          <div className="video-grid">
            <div className="video-tile">
              <video ref={myVideo} autoPlay muted playsInline />
              <div className="video-name">{user.name} (You)</div>
              {attendance[user._id] && <div className="attendance-indicator present"></div>}
            </div>
            {Object.entries(peers).map(([id, peer]) => (
              <Video key={id} peer={peer} name={id} attendance={attendance} />
            ))}
          </div>
          <div className="status-message">
            {statusMessage}
          </div>
          {finalAttendance && (
            <div className="final-attendance">
              <h3>Final Attendance Result</h3>
              <p>Present Time: {Math.floor(finalAttendance.presentTime / 60)}m {finalAttendance.presentTime % 60}s</p>
              <p>Status: <strong>{finalAttendance.status}</strong></p>
            </div>
          )}
          <div className="controls">
            <button onClick={() => setMicOn(!micOn)} className={`control-btn ${micOn ? '' : 'off'}`}>
              {micOn ? 'Mic On' : 'Mic Off'}
            </button>
            <button onClick={() => setCamOn(!camOn)} className={`control-btn ${camOn ? '' : 'off'}`}>
              {camOn ? 'Cam On' : 'Cam Off'}
            </button>
            {user.role === 'instructor' && (
              <button className="control-btn panel-btn" onClick={() => setShowPanel(!showPanel)}>
                Panel
              </button>
            )}
            <button onClick={leaveRoom} className="control-btn leave">
              Leave
            </button>
            <button onClick={onLogout} className="control-btn logout">
              Logout
            </button>
          </div>
          {showPanel && user.role === 'instructor' && (
            <div className="side-panel">
              <div className="logo-small">
                <h3>CT</h3>
                <span>Dashboard</span>
              </div>
              <div className="dashboard-section">
                <h4>Session Info</h4>
                <p>
                  <strong>Room:</strong> {roomId}
                </p>
                <p>
                  <strong>Host:</strong> {user.name}
                </p>
                <p>
                  <strong>Role:</strong> {user.role === 'instructor' ? 'Host' : 'Student'}
                </p>
                <p>
                  <strong>Participants:</strong> {Object.keys(peers).length + 1}
                </p>
              </div>
              <div className="dashboard-section">
                <h4>Session Analytics</h4>
                <p>
                  <strong>Total Participants:</strong> {analytics.totalParticipants}
                </p>
                <p>
                  <strong>Avg Attendance:</strong> {analytics.avgAttendance}%
                </p>
                <p>
                  <strong>Session Active:</strong> {analytics.activeNow ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="dashboard-section">
                <h4>AI Attendance</h4>
                <p>Real-time face detection keeps attendance tracking accurate for the session.</p>
                <ul>
                  <li>{user.name}: {attendance[user._id] ? 'Present' : 'Absent'}</li>
                  {Object.entries(attendance)
                    .filter(([id]) => id !== user._id)
                    .map(([id, present]) => (
                      <li key={id}>
                        {id}: {present ? 'Present' : 'Absent'}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="dashboard-section">
                <h4>Host Controls</h4>
                <button onClick={endSession}>End Session</button>
                <button>Share Meeting Link</button>
                <button>Invite Participants</button>
                <button>Record Session</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Video: React.FC<{ peer: any; name: string; attendance: { [id: string]: boolean } }> = ({
  peer,
  name,
  attendance
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    peer.on('stream', (currentStream: MediaStream) => {
      if (ref.current) ref.current.srcObject = currentStream;
    });
  }, [peer]);

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline />
      <div className="video-name">{name}</div>
      {attendance[name] && <div className="attendance-indicator present"></div>}
    </div>
  );
};

export default VideoChat;
