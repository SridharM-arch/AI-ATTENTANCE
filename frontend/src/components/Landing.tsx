import React from 'react';
import { motion } from 'framer-motion';
import { Presentation, Users, ArrowRight } from 'lucide-react';

interface LandingProps {
  onSelectRole: (role: 'host' | 'student') => void;
}

const Landing: React.FC<LandingProps> = ({ onSelectRole }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-6xl w-full"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-400/50 backdrop-blur-sm">
            <span className="text-sm font-semibold text-indigo-200">AI-Powered Attendance</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">
            Connect Together
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            Intelligent attendance tracking with real-time analytics and face recognition
          </p>
          <p className="text-lg text-gray-400">Launch sessions with confidence and track attendance in real time.</p>
        </motion.div>

        {/* Role Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {/* Host Card */}
          <motion.button
            variants={itemVariants}
            onClick={() => onSelectRole('host')}
            whileHover={{ 
              y: -12, 
              scale: 1.02,
              boxShadow: '0 40px 60px rgba(99, 102, 241, 0.5)',
              transition: { duration: 0.3 }
            }}
            whileTap={{ scale: 0.95 }}
            className="relative group p-8 rounded-2xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-400/50 backdrop-blur-xl hover:border-indigo-300/80 hover:brightness-110 transition-all duration-300 ease-in-out text-left overflow-hidden cursor-pointer active:scale-95"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mb-6 transition-transform duration-300 shadow-xl"
                whileHover={{ scale: 1.15, rotate: 5 }}
              >
                <Presentation className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Host</h2>
              <p className="text-gray-300 mb-4">Create sessions, monitor live participants, and review detailed analytics in real time.</p>
              <motion.div 
                className="flex items-center gap-2 text-indigo-300 group-hover:text-indigo-200 transition-colors duration-300"
                whileHover={{ x: 4 }}
              >
                <span className="text-sm font-semibold">Get Started</span>
                <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </motion.div>
            </div>
          </motion.button>

          {/* Student Card */}
          <motion.button
            variants={itemVariants}
            onClick={() => onSelectRole('student')}
            whileHover={{ 
              y: -12, 
              scale: 1.02,
              boxShadow: '0 40px 60px rgba(34, 197, 94, 0.5)',
              transition: { duration: 0.3 }
            }}
            whileTap={{ scale: 0.95 }}
            className="relative group p-8 rounded-2xl bg-gradient-to-br from-emerald-600/40 to-teal-600/40 border border-emerald-400/50 backdrop-blur-xl hover:border-emerald-300/80 hover:brightness-110 transition-all duration-300 ease-in-out text-left overflow-hidden cursor-pointer active:scale-95"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10">
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-6 transition-transform duration-300 shadow-xl"
                whileHover={{ scale: 1.15, rotate: -5 }}
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Student</h2>
              <p className="text-gray-300 mb-4">Join sessions instantly using a room code and track your attendance seamlessly.</p>
              <motion.div 
                className="flex items-center gap-2 text-emerald-300 group-hover:text-emerald-200 transition-colors duration-300"
                whileHover={{ x: 4 }}
              >
                <span className="text-sm font-semibold">Join Now</span>
                <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </motion.div>
            </div>
          </motion.button>
        </motion.div>

        {/* Footer Text */}
        <motion.p 
          variants={itemVariants}
          className="text-center mt-12 text-gray-400"
        >
          Choose your role to get started with AI-powered attendance tracking
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Landing;
