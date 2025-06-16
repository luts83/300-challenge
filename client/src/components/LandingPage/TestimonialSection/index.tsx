import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import TestimonialCard from './TestimonialCard';

const AUTO_SLIDE_DURATION = 180000; // 3분(180,000ms) 후 멈춤

const testimonials = [
  {
    content: '이 제품을 사용하고 나서 글쓰기 실력이 많이 향상되었어요!',
    author: 'Grace Shin',
  },
  {
    content: '피드백을 통해 많은 것을 배울 수 있었습니다.',
    author: '김작가',
  },
  {
    content: '매일 꾸준히 쓰는 습관이 생겼어요!',
    author: '이학생',
  },
];

const TestimonialSection: React.FC = () => {
  const [page, setPage] = useState(0);

  // 스크롤 애니메이션
  const [ref, inView] = useInView({
    triggerOnce: true, // 한 번만 트리거
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPage(p => (p + 1) % testimonials.length);
    }, 6000);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, AUTO_SLIDE_DURATION);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="w-full flex flex-col items-center py-10 bg-transparent"
    >
      <h3 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        사용자 후기
      </h3>
      <div className="relative w-full flex justify-center items-center min-h-[180px]">
        <AnimatePresence initial={false} mode="wait">
          <TestimonialCard
            key={page}
            content={testimonials[page].content}
            author={testimonials[page].author}
          />
        </AnimatePresence>
      </div>
      {/* 인디케이터 */}
      <div className="flex gap-2 justify-center mt-2">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setPage(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === page ? 'bg-gray-900 dark:bg-white scale-125' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            aria-label={`후기 ${idx + 1}번`}
          />
        ))}
      </div>
    </motion.section>
  );
};

export default TestimonialSection;
