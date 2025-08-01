import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import TestimonialCard from './TestimonialCard';

const AUTO_SLIDE_DURATION = 180000; // 3분(180,000ms) 후 멈춤

const testimonials = [
  {
    content:
      '다른 사람에게 피드백 받는 경험이 무척 좋았습니다. 단순히 기분을 표현하는것을 넘어서 어떻게 읽었는지 글자체의 의견을 받을 수 있어서 제 글을 객관화(?) 해보는데 도움이 되었어요~\n\nAI 점수도 업계에서 신뢰도 있는 그래이스님의 경험과 기준이 섬세하게 설계 된 것 같아 믿을 수 있었고요!',
    author: '안O정',
  },
  {
    content:
      '매일 새로운 글감이 주어지는 부분이 정말 좋았습니다. 평소에 생각해본 적 없는 주제에 대해서 돌아볼 수 있는 시간이라서 좋았어요.',
    author: '임O연',
  },
  {
    content:
      '글쓰기를 하고 싶지만, 블로그는 부담되고, SNS는 채널에 적합하지 않은 것 같고. 이러한 갈증을 해결해줘서 너무 좋았던 것 같습니다. 다양한 주제에 다른 사람들의 글도 보면서 공감할 수 있는 커뮤니티성도 있어서 좋았던 것 같습니다. 앞으로도 지속적으로 운영 해주셨으면 좋겠습니다.',
    author: '최O윤',
  },
  {
    content:
      '매일 꾸준히 할 수 있는 습관이 생겨서 좋았습니다. 처음에는 글자수도 시간도 부족했는데 갈수록 시간과 글자수에 맞춰 구조적인 글을 쓸 수 있었어요.',
    author: '임O서',
  },
  {
    content: '매일 쓰는 부담이 적어진 점이 좋았어요.',
    author: '형O',
  },
  {
    content:
      '카카오톡 단톡방을 통해 서비스 이용자와 소통을 한 점이 좋았습니다. 이용자가 서비스 이용 중 발생한 문제 상황을 이야기하면 빠른 조치를 해주시는 점이 타 서비스와의 차별점이자 강점이 될 수 있을 것 같습니다.',
    author: '한O름',
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
    }, 8000);

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
      <div className="flex gap-2 justify-center mt-6">
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
