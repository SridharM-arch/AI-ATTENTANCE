import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  const baseClasses = 'bg-gradient-to-br from-white/15 via-white/10 to-white/5 dark:from-white/5 dark:via-white/2 dark:to-transparent rounded-2xl p-6 border border-white/30 dark:border-white/10 shadow-xl backdrop-blur-xl hover:shadow-2xl transition-all duration-300';
  const hoverClass = hover ? 'cursor-pointer hover:scale-105 hover:border-white/50 dark:hover:border-white/20 hover:shadow-2xl hover:bg-gradient-to-br hover:from-white/20 hover:via-white/15 hover:to-white/10' : '';
  const transitionClass = 'transition-all duration-300 ease-in-out';

  return (
    <motion.div
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      className={`${baseClasses} ${hoverClass} ${transitionClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBgColor?: string;
}> = ({ icon, label, value, iconBgColor = 'bg-gradient-to-br from-indigo-500/40 to-purple-500/40' }) => {
  return (
    <Card hover>
      <div className="flex items-center gap-4">
        <motion.div 
          className={`p-5 rounded-xl ${iconBgColor} backdrop-blur-xl border border-white/20 shadow-xl`}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-white">
            {icon}
          </div>
        </motion.div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent mt-2">{value}</p>
        </div>
      </div>
    </Card>
  );
};
