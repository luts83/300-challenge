import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TestimonialCardProps {
  content: string;
  author: string;
}

const textVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const TestimonialCard: React.FC<TestimonialCardProps> = ({ content, author }) => (
  <motion.div
    className="p-6 bg-white dark:bg-gray-800 shadow-lg max-w-4xl mx-auto w-full rounded-2xl mx-[12px]"
    style={{
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <AnimatePresence mode="wait">
      <motion.p
        key={content}
        variants={textVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5 }}
        className="text-xl md:text-lg font-normal text-gray-900 dark:text-gray-100 text-center leading-snug mb-8"
      >
        “{content}”
      </motion.p>
    </AnimatePresence>
    <div className="text-center text-lg text-gray-500 dark:text-gray-400 font-light tracking-wide">
      {author}
    </div>
  </motion.div>
);

export default TestimonialCard;
