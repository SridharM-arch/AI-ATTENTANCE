import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Session, User } from '../types';
import './HostDashboard.css';

interface HostDashboardProps {
  user: User;
  onLogout: () => void;
  onStartSession: (session: Session) => void;
}

interface Student {
  studentId: string;
  name: string;
  imagePath: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  timestamp: string;
  status: string;
  presentTime?: number;
}

const HostDashboard: React.FC<HostDashboardProps> = ({ user, onLogout, onStartSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [newSessionMinType, setNewSessionMinType] = useState<'minutes' | 'percentage'>('percentage');
  const [newSessionMinValue, setNewSessionMinValue] = useState(75);
  const [faceEnrolled, setFaceEnrolled] = useState(user.faceEnrolled || false);
  const [enrolling, setEnrolling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const [insights, setInsights] = useState({
    totalParticipants: 0,
    avgAttendance: 85,
    totalSessions: 0,
    activeSessions: 0
  });

  const fetchSessions = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };
      const res = await axios.get('http://localhost:5000/api/sessions', config);
      const currentUserId = user._id || user.id;

      const mySessions = res.data.filter((s: Session) => {
        const instructorId =
          s.instructor?._id ||
          s.instructor?.id ||
          (typeof s.instructor === 'string' ? s.instructor : undefined);

        return instructorId === currentUserId;
      });

      setSessions(mySessions);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    }
  };

  const fetchInsights = () => {
    const totalParticipants = sessions.reduce((sum, s) => sum + (s.participants?.length || 0), 0);
    const activeSessions = sessions.filter((s) => s.isActive).length;

    setInsights({
      totalParticipants,
      avgAttendance: 85,
      totalSessions: sessions.length,
      activeSessions
    });
  };

  useEffect(() => {
    fetchSessions();
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [sessions]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/get-students');
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchAttendance = async (sessionId: string) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/attendance/${sessionId}`, getAuthHeaders());
      
      const transformedAttendance = res.data.attendances.map((att: any) => ({
        studentId: att.studentId,
        studentName: att.studentName || 'Unknown Student',
        timestamp: att.timestamp,
        status: att.status,
        presentTime: att.presentTime
      }));
      
      setAttendance(transformedAttendance);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendance([]);
    } finally {
      setShowAttendance(true);
    }
  };

  const generatePDFReport = async (sessionId: string) => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const response = await axios.get(`http://localhost:5000/api/attendance/report/${sessionId}`, {
        ...config,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim()) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };

      await axios.post('http://localhost:5000/api/sessions', { 
        title: newSessionTitle,
        duration: newSessionDuration,
        minAttendanceType: newSessionMinType,
        minAttendanceValue: newSessionMinValue
      }, config);
      await fetchSessions();
      setNewSessionTitle('');
      setNewSessionDuration(60);
      setNewSessionMinType('percentage');
      setNewSessionMinValue(75);
    } catch (error) {
      console.error('Failed to create session', error);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to create session');
      } else {
        alert('Failed to create session');
      }
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };

      await axios.post(`http://localhost:5000/api/sessions/${sessionId}/end`, {}, config);
      fetchSessions();
    } catch (error) {
      console.error('Failed to end session', error);
    }
  };

  const enrollFace = async () => {
    const userId = user._id || user.id;
    if (!userId) {
      alert('User ID is not available. Please log in again.');
      return;
    }
    setEnrolling(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait a bit for camera to adjust
      await new Promise(resolve => setTimeout(resolve, 2000));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const image = canvas.toDataURL('image/jpeg').split(',')[1];

      stream.getTracks().forEach(track => track.stop());

      const config = {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };

      const userId = user._id || user.id;
      await axios.post(`http://localhost:5000/api/users/${userId}/enroll-face`, { image }, config);
      setFaceEnrolled(true);
      alert('Face enrolled successfully!');
    } catch (error: any) {
      console.error('Face enrollment failed:', error);
      
      // Extract detailed error message from response
      let errorMsg = 'Face enrollment failed. Please try again.';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
        if (error.response.data.code === 'AI_SERVICE_DOWN') {
          errorMsg += '\n\nMake sure the Python AI service is running:\ncd ai-service && python app.py';
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(errorMsg);
    } finally {
      setEnrolling(false);
    }
  };

  const handleMultipleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();

      // Add all selected images
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      // Add student names (using filenames as default)
      const studentNames = Array.from(files).map(file => file.name.split('.')[0]);
      studentNames.forEach(name => formData.append('studentNames', name));

      const response = await axios.post('http://localhost:8000/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert(`Successfully uploaded ${response.data.total_uploaded} student(s)!`);
        if (response.data.total_failed > 0) {
          alert(`Failed to upload ${response.data.total_failed} image(s). Check console for details.`);
        }
        fetchStudents(); // Refresh student list
      } else {
        alert('Upload failed: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Host Dashboard</h1>
          <p>Welcome back, {user.name}</p>
        </div>
        <button className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-card create-session">
          <h2>Create Session</h2>
          <p className="section-copy">Set a title and launch a new live room in seconds.</p>
          <div className="inline-form">
            <input
              type="text"
              placeholder="Session title"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={newSessionDuration}
              onChange={(e) => setNewSessionDuration(Number(e.target.value))}
              min="1"
            />
            <select
              value={newSessionMinType}
              onChange={(e) => setNewSessionMinType(e.target.value as 'minutes' | 'percentage')}
            >
              <option value="percentage">Percentage</option>
              <option value="minutes">Minutes</option>
            </select>
            <input
              type="number"
              placeholder={newSessionMinType === 'percentage' ? 'Min % (0-100)' : 'Min minutes'}
              value={newSessionMinValue}
              onChange={(e) => setNewSessionMinValue(Number(e.target.value))}
              min="0"
              max={newSessionMinType === 'percentage' ? '100' : undefined}
            />
            <button className="primary-btn" onClick={createSession}>
              Create
            </button>
          </div>
        </section>

        {!faceEnrolled && (
          <section className="dashboard-card face-enrollment">
            <h2>Face Enrollment</h2>
            <p className="section-copy">Enroll your face using your camera for attendance recognition.</p>
            <button className="primary-btn" onClick={enrollFace} disabled={enrolling}>
              {enrolling ? 'Enrolling with camera...' : 'Enroll Face via Camera'}
            </button>
          </section>
        )}

        <section className="dashboard-card student-upload">
          <h2>Upload Student Images</h2>
          <p className="section-copy">Upload multiple student images for automatic attendance recognition.</p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleImageUpload}
            disabled={uploading}
            data-testid="multiple-upload-input"
          />
          <p style={{ fontSize: '0.85rem', color: '#777' }}>
            Select multiple images at once. Student names will be derived from filenames.
          </p>
          {uploading && <p>Uploading...</p>}
        </section>

        {students.length > 0 && (
          <section className="dashboard-card student-gallery">
            <h2>Enrolled Students ({students.length})</h2>
            <div className="student-grid">
              {students.map((student) => (
                <div key={student.studentId} className="student-card">
                  <img
                    src={`http://localhost:8000${student.imagePath}`}
                    alt={student.name}
                    className="student-image"
                  />
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <p>ID: {student.studentId}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="dashboard-card attendance-view">
          <h2>View Attendance</h2>
          <p className="section-copy">Select a session to view attendance records.</p>
          <select
            value={selectedSession?._id || ''}
            onChange={(e) => {
              const session = sessions.find(s => s._id === e.target.value);
              setSelectedSession(session || null);
            }}
            className="session-select"
          >
            <option value="">Select a session...</option>
            {sessions.map((session) => (
              <option key={session._id} value={session._id}>
                {session.title} ({session.participants?.length || 0} participants)
              </option>
            ))}
          </select>
          {selectedSession && (
            <div className="attendance-actions">
              <button
                className="primary-btn"
                onClick={() => fetchAttendance(selectedSession._id)}
              >
                View Attendance
              </button>
              <button
                className="secondary-btn"
                onClick={() => generatePDFReport(selectedSession._id)}
              >
                Generate PDF Report
              </button>
            </div>
          )}
        </section>

        {showAttendance && (
          <section className="dashboard-card attendance-list">
            <h2>Attendance Records</h2>
            {attendance.length === 0 ? (
              <p className="empty-state">No attendance records found for this session.</p>
            ) : (
              <div className="attendance-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Present Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, index) => (
                      <tr key={index}>
                        <td data-label="Student ID">{record.studentId}</td>
                        <td data-label="Student Name">{record.studentName}</td>
                        <td data-label="Present Time">{record.presentTime ? `${Math.floor(record.presentTime / 60)}m ${record.presentTime % 60}s` : '0s'}</td>
                        <td data-label="Status" className={`status-${record.status.toLowerCase()}`}>
                          {record.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="dashboard-card sessions">
          <h2>Your Sessions</h2>
          {sessions.length === 0 ? (
            <p className="empty-state">No sessions yet. Create one to get started.</p>
          ) : (
            <ul className="session-list">
              {sessions.map((session) => (
                <li key={session._id} className="session-item">
                  <div>
                    <h3>{session.title}</h3>
                    <p>Room: {session.roomId}</p>
                    <p>Participants: {session.participants?.length || 0}</p>
                    <p>Status: {session.isActive ? 'Active' : 'Ended'}</p>
                  </div>
                  <div className="session-actions">
                    {session.isActive ? (
                      <>
                        <button className="primary-btn" onClick={() => onStartSession(session)}>
                          Start
                        </button>
                        <button className="danger-btn" onClick={() => endSession(session._id)}>
                          End
                        </button>
                      </>
                    ) : (
                      <span className="chip">Closed</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-card insights">
          <h2>Insights</h2>
          <div className="insight-grid">
            <div className="insight-item">
              <span>Total Sessions</span>
              <strong>{insights.totalSessions}</strong>
            </div>
            <div className="insight-item">
              <span>Active Sessions</span>
              <strong>{insights.activeSessions}</strong>
            </div>
            <div className="insight-item">
              <span>Total Participants</span>
              <strong>{insights.totalParticipants}</strong>
            </div>
            <div className="insight-item">
              <span>Avg Attendance</span>
              <strong>{insights.avgAttendance}%</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HostDashboard;
