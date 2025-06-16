import React from 'react';
import { motion } from 'framer-motion';

interface UserPostCardProps {
  content: string;
  author: string;
  role: string;
}

const UserPostCard: React.FC<UserPostCardProps> = ({ content, author, role }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
    >
      <p className="text-gray-600 dark:text-gray-300 mb-4">"{content}"</p>
      <div className="flex items-center">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
          {author[0]}
        </div>
        <div className="ml-4">
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{role}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default UserPostCard;
