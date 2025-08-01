import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface AnimatedSectionProps {
  children: React.ReactNode;
  show?: boolean;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({ children, show = true }) => {
  const [ref, inView] = useInView({
    triggerOnce: true, // 한 번만 트리거되도록 변경
    threshold: 0.1, // threshold 값 낮춤
    rootMargin: '50px 0px', // 여유 공간 추가
  });

  return (
    <div ref={ref} className="w-full">
      <AnimatePresence>
        {show && inView && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} // y값 줄임
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }} // y값 줄임
            transition={{
              duration: 0.5, // duration 줄임
              ease: 'easeOut', // spring 대신 easeOut 사용
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedSection;
