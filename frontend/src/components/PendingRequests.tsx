import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Bell, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttendanceRequest {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  timestamp: string;
  status: string;
}

interface PendingRequestsProps {
  requests: AttendanceRequest[];
  onApprove: (requestId: string, studentId: string) => void;
  onReject: (requestId: string, studentId: string) => void;
  isExpanded?: boolean;
}

export const PendingRequests: React.FC<PendingRequestsProps> = ({
  requests,
  onApprove,
  onReject,
  isExpanded = true
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [approving, setApproving] = useState<{ [key: string]: boolean }>({});
  const [rejecting, setRejecting] = useState<{ [key: string]: boolean }>({});

  const handleApprove = async (requestId: string, studentId: string) => {
    setApproving(prev => ({ ...prev, [requestId]: true }));
    try {
      onApprove(requestId, studentId);
      toast.success('Request approved');
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setApproving(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleReject = async (requestId: string, studentId: string) => {
    setRejecting(prev => ({ ...prev, [requestId]: true }));
    try {
      onReject(requestId, studentId);
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setRejecting(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const hasRequests = requests && requests.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-40 max-w-md"
    >
      {/* Header / Collapsed */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
          hasRequests
            ? 'bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/30'
            : 'bg-green-500/20 border-green-500/40 hover:bg-green-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          {hasRequests ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Bell className="w-5 h-5 text-yellow-400" />
              </motion.div>
              <div className="text-left">
                <p className="text-sm font-semibold text-yellow-100">
                  Pending Requests
                </p>
                <p className="text-xs text-yellow-200">
                  {requests.length} request{requests.length !== 1 ? 's' : ''} waiting
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-green-100">
                  All Clear
                </p>
                <p className="text-xs text-green-200">
                  No pending requests
                </p>
              </div>
            </>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </motion.div>
      </motion.button>

      {/* Expanded List */}
      <AnimatePresence>
        {expanded && hasRequests && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mt-3 space-y-2 max-h-96 overflow-y-auto"
          >
            {requests.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 shadow-xl hover:shadow-2xl transition-all"
              >
                {/* Student Info */}
                <div className="mb-3">
                  <p className="font-semibold text-white">{request.studentName}</p>
                  <p className="text-xs text-gray-300 font-mono">{request.studentId}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleApprove(request.id, request.studentId)}
                    disabled={approving[request.id] || rejecting[request.id]}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {approving[request.id] ? 'Approving...' : 'Approve'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleReject(request.id, request.studentId)}
                    disabled={approving[request.id] || rejecting[request.id]}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    {rejecting[request.id] ? 'Rejecting...' : 'Reject'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PendingRequests;
