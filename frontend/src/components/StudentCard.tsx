import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2, Save, X } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  studentId: string;
  imagePreview: string;
  timestamp: number;
}

interface StudentCardProps {
  student: Student;
  isHost: boolean;
  onDelete: (studentId: string) => void;
  onUpdate: (student: Student) => void;
  onIdConflict?: (existingId: string, newId: string) => boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  isHost,
  onDelete,
  onUpdate,
  onIdConflict
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editId, setEditId] = useState(student.studentId);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (!editId.trim()) {
      setError('Student ID cannot be empty');
      return;
    }

    // Check for duplicate ID
    if (editId !== student.studentId && onIdConflict && onIdConflict(student.studentId, editId)) {
      setError('This Student ID is already in use');
      return;
    }

    setError('');
    onUpdate({
      ...student,
      name: editName.trim(),
      studentId: editId.trim()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(student.name);
    setEditId(student.studentId);
    setError('');
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="group bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-800/40 dark:to-gray-900/40 rounded-2xl overflow-hidden border border-white/20 dark:border-gray-700/40 shadow-lg hover:shadow-2xl hover:border-white/40 transition-all duration-300 backdrop-blur-xl hover:scale-105"
    >
      {/* Image Container */}
      <div className="relative w-full h-56 bg-gradient-to-br from-purple-600/20 to-pink-600/20 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        {student.imagePreview ? (
          <motion.img
            src={student.imagePreview}
            alt={student.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-400/30 dark:from-gray-700 to-gray-500/30 dark:to-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-400/20 dark:bg-gray-600/30 flex items-center justify-center">
                <span className="text-3xl text-gray-500 dark:text-gray-400">👤</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">No Image</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-5 space-y-4">
        {!isEditing ? (
          <>
            {/* Display Mode */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/70 dark:text-purple-400/60 mb-1">Name</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white bg-clip-text">{student.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300/70 dark:text-purple-400/60 mb-1">Student ID</p>
                <p className="text-lg font-mono font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg w-fit">{student.studentId}</p>
              </div>
            </div>

            {/* Actions */}
            {isHost && (
              <div className="flex gap-2 pt-3 border-t border-white/10 dark:border-gray-700/30">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDelete(student.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </motion.button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Edit Mode */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-purple-300/70 dark:text-purple-400/60 mb-2 block">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter student name"
                  className="w-full px-4 py-2.5 bg-white/10 dark:bg-gray-900/40 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-white/20 dark:border-gray-700/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all duration-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-purple-300/70 dark:text-purple-400/60 mb-2 block">Student ID</label>
                <input
                  type="text"
                  value={editId}
                  onChange={(e) => {
                    setEditId(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter student ID"
                  className={`w-full px-4 py-2.5 bg-white/10 dark:bg-gray-900/40 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all duration-200 ${
                    error && error.includes('Student ID') 
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500' 
                      : 'border-white/20 dark:border-gray-700/40'
                  }`}
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 dark:text-red-400 font-medium bg-red-500/10 p-2 rounded-lg"
                >
                  ⚠️ {error}
                </motion.p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10 dark:border-gray-700/30">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-green-500/30 transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                Save
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300"
              >
                <X className="w-4 h-4" />
                Cancel
              </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default StudentCard;
