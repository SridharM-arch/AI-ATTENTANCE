import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantClass = {
  primary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 hover:from-indigo-600 hover:via-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300',
  secondary: 'bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 text-white border border-white/20 hover:border-white/40 shadow-md hover:shadow-lg backdrop-blur-xl transition-all duration-300',
  danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300',
  success: 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300',
  outline: 'border border-white/30 hover:border-white/50 hover:bg-white/10 dark:hover:bg-white/5 text-white backdrop-blur-xl transition-all duration-300'
};

const sizeClass = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false
}) => {
  const widthClass = fullWidth ? 'w-full' : '';
  const baseClasses = 'rounded-xl font-semibold transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClass[variant]} ${sizeClass[size]} ${widthClass} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {loading ? 'Loading...' : children}
    </motion.button>
  );
};
