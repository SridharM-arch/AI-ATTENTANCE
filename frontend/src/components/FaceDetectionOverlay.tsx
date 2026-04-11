import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface FaceDetectionOverlayProps {
  isDetected: boolean;
  isProcessing: boolean;
  faceCount: number;
}

export const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  isDetected,
  isProcessing,
  faceCount
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed bottom-24 left-4 z-30 max-w-sm"
    >
      <div className={`backdrop-blur-xl border rounded-2xl p-4 shadow-2xl transition-all duration-300 ${
        isDetected
          ? 'bg-green-500/20 border-green-400/50'
          : isProcessing
          ? 'bg-blue-500/20 border-blue-400/50'
          : 'bg-red-500/20 border-red-400/50'
      }`}>
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="flex-shrink-0"
          >
            {isDetected ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
              />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
          </motion.div>

          <div className="flex-1">
            <h3 className={`font-semibold ${
              isDetected
                ? 'text-green-100'
                : isProcessing
                ? 'text-blue-100'
                : 'text-red-100'
            }`}>
              {isDetected
                ? '✅ Face Detected'
                : isProcessing
                ? '🔄 Scanning...'
                : '❌ No Face Detected'}
            </h3>
            <p className={`text-sm mt-1 ${
              isDetected
                ? 'text-green-200'
                : isProcessing
                ? 'text-blue-200'
                : 'text-red-200'
            }`}>
              {isDetected
                ? `${faceCount} face${faceCount !== 1 ? 's' : ''} recognized`
                : isProcessing
                ? 'Analyzing video stream...'
                : 'Please position yourself in frame'}
            </p>
          </div>
        </div>

        {/* Progress Bar for Processing */}
        {isProcessing && (
          <motion.div
            className="mt-3 h-1 bg-blue-900/40 rounded-full overflow-hidden"
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FaceDetectionOverlay;
