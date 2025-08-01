import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface UseCaseSectionProps {
  show: boolean;
}

const UseCaseSection: React.FC<UseCaseSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const useCases = [
    {
      before: '아이디어는 많은데 기획안에 정리하면 늘 흐름이 어색하다.',
      after:
        '매일 300자 훈련을 통해 핵심 메시지를 구조화하는 능력이 생겨 기획서 초안이 훨씬 빨라지고 논리적이 됐다.',
      category: '기획',
      icon: '📋',
    },
    {
      before: '클라이언트 피드백을 받고 나면 방향이 흔들리고 방어적으로 대응하곤 했다.',
      after:
        '피어 피드백을 주고받는 과정에서 타인의 관점에 익숙해지며, 비판을 분석적으로 수용하는 힘이 생겼다.',
      category: '커뮤니케이션',
      icon: '💬',
    },
    {
      before: '캠페인 슬로건이나 CTA 문구를 쓸 때 매번 뻔한 표현만 떠오른다.',
      after:
        '다양한 주제에 대해 짧게 쓰는 훈련을 하며 언어 감각이 예민해졌고, 더 정확하고 흡입력 있는 문장을 만들 수 있게 됐다.',
      category: '마케팅',
      icon: '📢',
    },
    {
      before:
        '팀 회의에서 아이디어를 말로 설명하는 데 시간이 오래 걸리고, 요지가 잘 전달되지 않았다.',
      after: '글쓰기를 통해 미리 정리된 메시지를 공유하면서 회의가 명확해지고 영향력이 커졌다.',
      category: '협업',
      icon: '👥',
    },
    {
      before:
        '콘텐츠를 만들 때마다 "이게 재미있을까?" "공감받을까?" 같은 불안에 빠져 시작이 어렵다.',
      after:
        '매일 쓰고 피드백을 받는 과정을 통해, 반응 예측 감각이 생기고 자기 스타일에 대한 자신감이 생겼다.',
      category: '콘텐츠',
      icon: '🎨',
    },
    {
      before: '긴 글을 쓸 땐 의욕이 넘치다가 중간에 흐름이 끊기고 마무리가 늘 약했다.',
      after: '1000자 쓰기와 세션 기록을 통해 흐름을 끝까지 유지하고, 시간 관리도 병행하게 되었다.',
      category: '집중력',
      icon: '⏰',
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
        사용자들이 경험한 변화
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {useCases.map((useCase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 mr-3">
                {useCase.icon}
              </div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 px-3 py-1 rounded-full">
                {useCase.category}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Before
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {useCase.before}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  After
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {useCase.after}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default UseCaseSection;
