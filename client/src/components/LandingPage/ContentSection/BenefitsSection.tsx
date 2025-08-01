import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface BenefitsSectionProps {
  show: boolean;
}

const BenefitsSection: React.FC<BenefitsSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const benefits = [
    {
      title: '복잡한 생각을 짧고 명확하게 정리하는 힘',
      description:
        '300자 훈련을 통해 핵심 메시지를 구조화하는 능력이 생겨 기획서 초안이 훨씬 빨라지고 논리적이 됩니다.',
      icon: '🎯',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: '낯선 주제에도 흔들리지 않는 사고력과 글쓰기 내공',
      description:
        '다양한 주제에 대한 훈련으로 어떤 상황에서도 자신감 있게 글을 쓸 수 있게 됩니다.',
      icon: '🧠',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      title: '설득력 있는 메시지를 구성하는 감각',
      description:
        '피드백을 통해 독자의 관점을 이해하고, 더욱 설득력 있는 메시지를 전달할 수 있게 됩니다.',
      icon: '💬',
      color: 'from-purple-500 to-violet-500',
    },
    {
      title: '타인의 시선을 통해 내 생각을 객관화하는 경험',
      description:
        '피어 피드백을 주고받는 과정에서 타인의 관점에 익숙해지며, 비판을 분석적으로 수용하는 힘이 생깁니다.',
      icon: '👁️',
      color: 'from-orange-500 to-amber-500',
    },
    {
      title: '기획, 마케팅, 커뮤니케이션에 바로 적용 가능한 글쓰기 실전력',
      description: '실무에서 바로 활용할 수 있는 실전적인 글쓰기 능력을 기를 수 있습니다.',
      icon: '⚡',
      color: 'from-red-500 to-pink-500',
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
        글쓰기, 실무에 이렇게 도움이 돼요
      </h3>

      <div className="space-y-6">
        {benefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start space-x-4">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-r ${benefit.color} flex items-center justify-center text-xl flex-shrink-0`}
              >
                {benefit.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                  {benefit.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default BenefitsSection;
