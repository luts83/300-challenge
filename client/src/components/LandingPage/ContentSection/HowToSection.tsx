import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface HowToSectionProps {
  show: boolean;
}

const HowToSection: React.FC<HowToSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const steps = [
    {
      step: '01',
      title: '매일',
      description: '꾸준한 습관으로 글쓰기 능력을 기릅니다',
      icon: '📅',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      step: '02',
      title: '다양한 주제에 대해',
      description: '새로운 관점과 사고를 경험합니다',
      icon: '🎯',
      color: 'from-purple-500 to-pink-500',
    },
    {
      step: '03',
      title: '짧고 긴 글쓰기',
      description: '300자와 1000자로 다양한 표현력을 기릅니다',
      icon: '✍️',
      color: 'from-green-500 to-emerald-500',
    },
    {
      step: '04',
      title: '피드백을 받는 과정',
      description: 'AI 피드백과 피어 피드백으로 성장합니다',
      icon: '💡',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="mt-16"
    >
      <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        딜라이팅 AI의 특별한 성장 레시피
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            className="relative"
          >
            {/* 연결선 */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 transform -translate-y-1/2 z-0" />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow relative z-10">
              <div className="text-center">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-2xl`}
                >
                  {step.icon}
                </div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {step.step}
                </div>
                <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                  {step.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 하단 설명 */}
      <div className="mt-8 text-center">
        <div
          className="
            text-lg sm:text-xl md:text-2xl font-bold
            bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500
            bg-clip-text text-transparent
            font-nanum-pen
          "
        >
          이 모든 과정을 통해 당신만의 글쓰기 실력을 키워보세요
        </div>
      </div>
    </motion.div>
  );
};

export default HowToSection;
