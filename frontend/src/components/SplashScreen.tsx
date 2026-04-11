import { motion } from 'framer-motion';
import { useEffect } from 'react';

type SplashScreenProps = {
  onFinish: () => void;
};

function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 7000);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.0,
        delayChildren: 0.2
      }
    }
  };

  const logoVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.8
      }
    }
  };

  const letterVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.15,
        type: 'spring',
        stiffness: 120,
        damping: 12
      }
    })
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        delay: 1.5
      }
    }
  };

  const dotsVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
        delay: 2.0
      }
    }
  };

  return (
    <motion.div
      className="relative w-full min-h-screen h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-80 h-80 bg-purple-600 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-32 right-10 w-96 h-96 bg-pink-600 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.25, 0.2]
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center gap-6 text-center px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* CT Logo */}
        <motion.div
          variants={logoVariants}
          className="flex items-center justify-center gap-3"
        >
          <motion.span
            custom={0}
            variants={letterVariants}
            className="text-8xl md:text-9xl font-black bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent drop-shadow-lg"
          >
            C
          </motion.span>
          <motion.span
            custom={1}
            variants={letterVariants}
            className="text-8xl md:text-9xl font-black bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent drop-shadow-lg"
          >
            T
          </motion.span>
        </motion.div>

        {/* Subtitle: Connect Together */}
        <motion.p
          variants={subtitleVariants}
          className="text-2xl md:text-4xl font-bold text-gray-300 tracking-widest mt-4 drop-shadow-lg"
        >
          Connect Together
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          variants={dotsVariants}
          className="flex items-center gap-2 mt-8"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 bg-white/70 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-white/70 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-white/70 rounded-full"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default SplashScreen;
