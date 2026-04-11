import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface AttendanceProgressBarProps {
  presentTime: number;
  totalTime: number;
  participantsPresent: number;
  totalParticipants: number;
  sessionStatus: 'active' | 'ended';
}

export const AttendanceProgressBar: React.FC<AttendanceProgressBarProps> = ({
  presentTime,
  totalTime,
  participantsPresent,
  totalParticipants,
  sessionStatus
}) => {
  const attendancePercent = useMemo(() => {
    if (totalTime === 0) return 0;
    return Math.min(Math.round((presentTime / totalTime) * 100), 100);
  }, [presentTime, totalTime]);

  const participantPercent = useMemo(() => {
    if (totalParticipants === 0) return 0;
    return Math.round((participantsPresent / totalParticipants) * 100);
  }, [participantsPresent, totalParticipants]);

  const getAttendanceColor = (percent: number) => {
    if (percent < 50) return 'from-red-500 to-red-600';
    if (percent < 75) return 'from-yellow-500 to-amber-600';
    return 'from-green-500 to-emerald-600';
  };

  const getAttendanceBgColor = (percent: number) => {
    if (percent < 50) return 'bg-red-500/20 border-red-500/40';
    if (percent < 75) return 'bg-yellow-500/20 border-yellow-500/40';
    return 'bg-green-500/20 border-green-500/40';
  };

  const getAttendanceTextColor = (percent: number) => {
    if (percent < 50) return 'text-red-400';
    if (percent < 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getAttendanceLabel = (percent: number) => {
    if (percent < 50) return '⚠️ Low';
    if (percent < 75) return '📊 Fair';
    return '✅ Good';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-4 z-30 max-w-sm backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-3xl hover:border-white/40 transition-all duration-300"
    >
      <div className="space-y-5">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          whileHover={{ x: 2 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="w-5 h-5 text-purple-300" />
            </motion.div>
            <span className="text-white font-bold text-sm">Attendance Tracking</span>
          </div>
          <motion.span
            key={attendancePercent}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl font-black ${getAttendanceTextColor(attendancePercent)}`}
          >
            {attendancePercent}%
          </motion.span>
        </motion.div>

        {/* Attendance Progress */}
        <div className={`p-4 rounded-xl backdrop-blur-sm border ${getAttendanceBgColor(attendancePercent)}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/90 font-semibold text-sm">Your Time Present</span>
            <span className={`text-sm font-bold px-2 py-1 rounded-lg ${getAttendanceTextColor(attendancePercent)} bg-white/10`}>
              {getAttendanceLabel(attendancePercent)}
            </span>
          </div>

          <div className="relative h-4 bg-gray-800/50 rounded-full overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${attendancePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${getAttendanceColor(attendancePercent)} shadow-lg relative`}
            >
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-white/20"
              />
            </motion.div>
          </div>

          <p className="text-xs text-gray-200 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(presentTime)} out of {formatTime(totalTime)}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/20 to-white/10" />

        {/* Participants */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              >
                <Users className="w-5 h-5 text-blue-300" />
              </motion.div>
              <span className="text-white font-semibold text-sm">Participants Present</span>
            </div>
            <motion.span
              key={participantPercent}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-blue-400"
            >
              {participantPercent}%
            </motion.span>
          </div>

          <div className="relative h-3 bg-gray-800/50 rounded-full overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${participantPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg"
            />
          </div>

          <p className="text-xs text-gray-200 mt-2">
            {participantsPresent} of {totalParticipants} participants
          </p>
        </div>

        {/* Session Status */}
        <motion.div 
          className={`mt-2 p-3 rounded-xl border flex items-center gap-2 font-semibold text-sm ${
            sessionStatus === 'active'
              ? 'bg-green-500/20 border-green-500/40 text-green-200'
              : 'bg-red-500/20 border-red-500/40 text-red-200'
          }`}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className={`w-3 h-3 rounded-full ${
              sessionStatus === 'active' ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          {sessionStatus === 'active' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Session Active
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              Session Ended
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AttendanceProgressBar;
