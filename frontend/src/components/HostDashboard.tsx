import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Calendar, TrendingUp, Crown, Camera, Play, Square, FileText, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from './ThemeProvider';
import { Card, StatCard, Button, Input, FileDropzone } from './ui';
import { StudentCard } from './StudentCard';
import { getBackendUrl, getAIServiceUrl } from '../config';
import type { Session, User } from '../types';

interface Student {
  id: string;
  name: string;
  studentId: string;
  imagePreview: string;
  timestamp: number;
}

interface HostDashboardProps {
  user: User;
  onLogout: () => void;
  onStartSession: (session: Session) => void;
}

const HostDashboard: React.FC<HostDashboardProps> = ({ user, onLogout, onStartSession }) => {
  const { theme, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [newSessionMinType, setNewSessionMinType] = useState<'minutes' | 'percentage'>('percentage');
  const [newSessionMinValue, setNewSessionMinValue] = useState(75);
  const [enrolling, setEnrolling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [insights, setInsights] = useState({
    totalParticipants: 0,
    avgAttendance: 85,
    totalSessions: 0,
    activeSessions: 0
  });

  // Load students from localStorage on mount
  useEffect(() => {
    const savedStudents = localStorage.getItem(`students_${user._id || user.id}`);
    if (savedStudents) {
      try {
        setEnrolledStudents(JSON.parse(savedStudents));
      } catch (error) {
        console.error('Failed to parse saved students:', error);
      }
    }
  }, [user._id, user.id]);

  // Save students to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`students_${user._id || user.id}`, JSON.stringify(enrolledStudents));
  }, [enrolledStudents, user._id, user.id]);

  // Validation: Check if student ID already exists
  const studentIdExists = (studentId: string, excludeId?: string): boolean => {
    return enrolledStudents.some(
      (s) => s.studentId === studentId && (!excludeId || s.id !== excludeId)
    );
  };

  // Add or update student
  const addStudent = (student: Student) => {
    setEnrolledStudents((prevStudents) => {
      const existingIndex = prevStudents.findIndex((s) => s.id === student.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prevStudents];
        updated[existingIndex] = student;
        return updated;
      } else {
        // Add new
        return [...prevStudents, student];
      }
    });
  };

  // Delete student
  const deleteStudent = (studentId: string) => {
    setEnrolledStudents((prevStudents) =>
      prevStudents.filter((s) => s.id !== studentId)
    );
    toast.success('Student deleted successfully');
  };

  // Update student handler (with validation)
  const handleUpdateStudent = (updatedStudent: Student) => {
    // Check for duplicate ID
    if (studentIdExists(updatedStudent.studentId, updatedStudent.id)) {
      toast.error('This Student ID is already in use');
      return false;
    }
    addStudent(updatedStudent);
    toast.success('Student updated successfully');
    return true;
  };

  // Check ID conflict
  const checkIdConflict = (oldId: string, newId: string): boolean => {
    if (oldId === newId) return false;
    return studentIdExists(newId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${getBackendUrl()}/api/sessions`, getAuthHeaders());
      const currentUserId = user._id || user.id;
      const mySessions = res.data.filter((s: Session) => {
        const instructorId = s.instructor?._id || s.instructor?.id || (typeof s.instructor === 'string' ? s.instructor : undefined);
        return instructorId === currentUserId;
      });
      setSessions(mySessions);

      // Update insights
      const activeSessions = mySessions.filter((s: Session) => s.isActive).length;
      const totalParticipants = mySessions.reduce((sum: number, s: Session) => sum + (s.participants?.length || 0), 0);

      setInsights({
        totalSessions: mySessions.length,
        activeSessions,
        avgAttendance: 85,
        totalParticipants
      });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const createSession = async () => {
    if (!newSessionTitle.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    try {
      await axios.post(`${getBackendUrl()}/api/sessions`, {
        title: newSessionTitle,
        duration: newSessionDuration,
        minAttendanceType: newSessionMinType,
        minAttendanceValue: newSessionMinValue
      }, getAuthHeaders());

      await fetchSessions();
      setNewSessionTitle('');
      setNewSessionDuration(60);
      setNewSessionMinType('percentage');
      setNewSessionMinValue(75);
      toast.success('Session created successfully!');
    } catch (error) {
      console.error('Failed to create session', error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to create session');
      } else {
        toast.error('Failed to create session');
      }
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await axios.post(`${getBackendUrl()}/api/sessions/${sessionId}/end`, {}, getAuthHeaders());
      fetchSessions();
      toast.success('Session ended successfully!');
    } catch (error) {
      console.error('Failed to end session', error);
      toast.error('Failed to end session');
    }
  };

  const enrollFace = async () => {
    setEnrolling(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const imageDataUrl = canvas.toDataURL('image/jpeg');

      stream.getTracks().forEach(track => track.stop());

      // Show prompt for name and ID
      const studentName = prompt('Enter student name:');
      if (!studentName) {
        toast.error('Student name is required');
        setEnrolling(false);
        return;
      }

      const studentId = prompt('Enter student ID:');
      if (!studentId) {
        toast.error('Student ID is required');
        setEnrolling(false);
        return;
      }

      // Check for duplicate ID
      if (studentIdExists(studentId)) {
        toast.error('This Student ID is already in use');
        setEnrolling(false);
        return;
      }

      // Add student to enrolled list
      const newStudent: Student = {
        id: `student_${Date.now()}`,
        name: studentName.trim(),
        studentId: studentId.trim(),
        imagePreview: imageDataUrl,
        timestamp: Date.now()
      };

      addStudent(newStudent);
      toast.success('Student enrolled successfully!');
    } catch (error: any) {
      console.error('Face enrollment failed:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found. Please connect a camera device.');
      } else {
        toast.error('Face enrollment failed. Please try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleMultipleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Create image previews and add as students
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name.split('.')[0];

        // Create preview URL
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          const imageDataUrl = e.target?.result as string;

          // Validate unique ID
          if (studentIdExists(fileName)) {
            toast.error(`Student ID "${fileName}" already exists. Skipping this file.`);
            return;
          }

          // Create student
          const newStudent: Student = {
            id: `student_${Date.now()}_${i}`,
            name: fileName,
            studentId: fileName,
            imagePreview: imageDataUrl,
            timestamp: Date.now()
          };

          addStudent(newStudent);
        };

        fileReader.readAsDataURL(file);
      }

      toast.success(`Added ${files.length} student image(s)!`);

      // Optional: Also upload to backend for face recognition
      try {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('images', files[i]);
        }

        const studentNames = Array.from(files).map(file => file.name.split('.')[0]);
        studentNames.forEach(name => formData.append('studentNames', name));

        await axios.post(`${getAIServiceUrl()}/upload-multiple`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } catch (uploadError) {
        console.warn('Could not upload to AI service, but images are saved locally:', uploadError);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user._id, user.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-10 w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 backdrop-blur-2xl bg-opacity-95 border-b border-purple-400/20 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              📊 Attendance Hub
            </h1>
            <p className="text-purple-100 text-sm mt-1">Welcome back, {user.name}</p>
          </motion.div>
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-white">{user.name}</span>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/20"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-white" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-300" />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-semibold transition-all flex items-center gap-2 backdrop-blur-md border border-red-400/30"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Calendar className="w-6 h-6 text-blue-300" />}
              label="Total Sessions"
              value={insights.totalSessions}
              iconBgColor="bg-gradient-to-br from-blue-500/30 to-cyan-500/30"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Users className="w-6 h-6 text-emerald-300" />}
              label="Active Sessions"
              value={insights.activeSessions}
              iconBgColor="bg-gradient-to-br from-emerald-500/30 to-teal-500/30"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-purple-300" />}
              label="Avg Attendance"
              value={`${insights.avgAttendance}%`}
              iconBgColor="bg-gradient-to-br from-purple-500/30 to-pink-500/30"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Crown className="w-6 h-6 text-amber-300" />}
              label="Total Participants"
              value={insights.totalParticipants}
              iconBgColor="bg-gradient-to-br from-amber-500/30 to-orange-500/30"
            />
          </motion.div>
        </motion.div>

        {/* Create Session Section */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">✨ Create New Session</h2>
                <p className="text-gray-300">Set up a new attendance session with your preferred settings</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Session Title"
                  placeholder="Enter session name"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  required
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  placeholder="60"
                  value={newSessionDuration}
                  onChange={(e) => setNewSessionDuration(Number(e.target.value))}
                  min={1}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Attendance Type
                  </label>
                  <select
                    value={newSessionMinType}
                    onChange={(e) => setNewSessionMinType(e.target.value as 'minutes' | 'percentage')}
                    className="w-full px-5 py-3 rounded-xl border border-gray-300 dark:border-white/30 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 font-medium hover:border-gray-400 dark:hover:border-white/40"
                  >
                    <option value="percentage" className="text-black bg-white">Percentage (%)</option>
                    <option value="minutes" className="text-black bg-white">Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum {newSessionMinType === 'percentage' ? 'Attendance (%)' : 'Duration (min)'}
                </label>
                <input
                  type="number"
                  placeholder={newSessionMinType === 'percentage' ? '0-100' : 'minutes'}
                  value={newSessionMinValue}
                  onChange={(e) => setNewSessionMinValue(Number(e.target.value))}
                  min="0"
                  max={newSessionMinType === 'percentage' ? '100' : undefined}
                  className="w-full px-5 py-3 rounded-xl border border-gray-300 dark:border-white/30 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 ease-in-out font-medium hover:border-gray-400 dark:hover:border-white/40 caret-black dark:caret-white"
                />
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={createSession}
              >
                <Calendar className="w-5 h-5" />
                Create Session
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Face Enrollment & Upload in Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Face Enrollment */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Face Enrollment</h2>
                  <p className="text-gray-600 dark:text-gray-400">Capture student face or enroll yourself</p>
                </div>

                <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-dashed border-green-200 dark:border-green-800 text-center">
                  <Camera className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Click the button below to capture a face</p>
                </div>

                <Button
                  variant="success"
                  fullWidth
                  onClick={enrollFace}
                  loading={enrolling}
                  icon={<Camera className="w-5 h-5" />}
                >
                  {enrolling ? 'Capturing...' : 'Capture Face'}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Upload Students */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upload Student Images</h2>
                  <p className="text-gray-600 dark:text-gray-400">Drag & drop or select multiple images</p>
                </div>

                <FileDropzone
                  onFiles={handleMultipleImageUpload}
                  multiple
                  accept="image/*"
                  disabled={uploading}
                  loading={uploading}
                />
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enrolled Students Section */}
        {enrolledStudents.length > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.45 }}
          >
            <Card>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">👥 Enrolled Students</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} enrolled
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {enrolledStudents && enrolledStudents.length > 0 && enrolledStudents.map((student) => (
                      student && student.id ? (
                        <StudentCard
                          key={student.id}
                          student={student}
                          isHost={true}
                          onDelete={deleteStudent}
                          onUpdate={handleUpdateStudent}
                          onIdConflict={checkIdConflict}
                        />
                      ) : null
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Sessions List */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Sessions</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {sessions.length === 0 ? 'No sessions yet' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No sessions yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map((session) => (
                    <motion.div
                      key={session._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -4 }}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white pr-2">{session.title}</h3>
                          <motion.span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              session.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {session.isActive ? '● Active' : 'Ended'}
                          </motion.span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          <p><span className="font-medium">Room ID:</span> {session.roomId}</p>
                          <p><span className="font-medium">Duration:</span> {session.duration} min</p>
                          <p><span className="font-medium">Participants:</span> {session.participants?.length || 0}</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          {session.isActive ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onStartSession(session)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <Play className="w-4 h-4" />
                                Join
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => endSession(session._id)}
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <Square className="w-4 h-4" />
                              </motion.button>
                            </>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <FileText className="w-4 h-4" />
                              Report
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default HostDashboard;

