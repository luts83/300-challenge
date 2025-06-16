import React from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  show: boolean;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ show, title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 20,
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="flex items-start space-x-3"
    >
      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
      <div>
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
