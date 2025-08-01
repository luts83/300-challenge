import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface TargetAudienceSectionProps {
  show: boolean;
}

const TargetAudienceSection: React.FC<TargetAudienceSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const audiences = [
    {
      title: '기획자',
      description: '아이디어를 명확하고 설득력 있게 정리하는 능력',
      icon: '📋',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: '마케터',
      description: '타겟에게 전달력 있는 메시지를 구성하는 감각',
      icon: '📢',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: '콘텐츠 크리에이터',
      description: '독자의 마음을 사로잡는 스토리텔링 능력',
      icon: '🎨',
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
        이런 분들께 추천해요
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {audiences.map((audience, index) => (
          <motion.div
            key={audience.title}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${audience.color} flex items-center justify-center text-2xl`}
            >
              {audience.icon}
            </div>
            <h4 className="text-xl font-bold text-center mb-3 text-gray-900 dark:text-white">
              {audience.title}
            </h4>
            <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
              {audience.description}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default TargetAudienceSection;
