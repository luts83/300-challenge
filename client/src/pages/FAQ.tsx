import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const FAQ: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [formLink, setFormLink] = useState(
    'https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform'
  );

  useEffect(() => {
    fetchFormLink();
  }, []);

  const fetchFormLink = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/landing/current-form-link`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (responseData.success && responseData.data.formLink) {
        setFormLink(responseData.data.formLink);
      }
    } catch (error) {
      console.log('폼 링크 가져오기 실패, 기본 링크 사용:', error);
    }
  };

  const renderAnswer = (answer: string) => {
    // "신청서" 텍스트를 링크로 변환
    const parts = answer.split('신청서');
    if (parts.length > 1) {
      return (
        <>
          {parts[0]}
          <a
            href={formLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            신청서
          </a>
          {parts[1]}
        </>
      );
    }
    return answer;
  };

  const faqData: FAQItem[] = [
    {
      id: 1,
      question: '회원가입은 어떻게 하나요?',
      answer:
        '현재 딜라이팅 AI는 베타 서비스 단계로, 초대를 받은 사용자만 이용할 수 있습니다. 서비스 오픈 시 공식 웹사이트를 통해 회원가입이 가능할 예정입니다. 베타 서비스 참여를 원하시면 신청서를 통해 신청해 주세요.',
      category: '계정',
    },
    {
      id: 2,
      question: '비밀번호를 잊어버렸어요.',
      answer: "로그인 페이지에서 '비밀번호 찾기' 기능을 이용하시거나, 고객센터로 문의해 주세요.",
      category: '계정',
    },
    {
      id: 3,
      question: '계정을 삭제하고 싶어요.',
      answer:
        '계정 삭제를 원하시면 고객센터로 문의해 주세요. 삭제된 계정의 데이터는 복구할 수 없습니다.',
      category: '계정',
    },
    {
      id: 4,
      question: '글쓰기 주제는 어떻게 정해지나요?',
      answer:
        '매일 새로운 주제가 제공되며, 주제는 다양한 분야에서 선정됩니다. 사용자가 직접 주제를 선택할 수도 있습니다.',
      category: '서비스',
    },
    {
      id: 5,
      question: 'AI 피드백은 어떤 내용을 제공하나요?',
      answer:
        'AI 피드백은 글의 구조, 문법, 표현력, 논리성 등을 종합적으로 분석하여 개선점을 제시합니다.',
      category: '서비스',
    },
    {
      id: 6,
      question: '작성한 글은 어디에 저장되나요?',
      answer:
        "작성한 글은 개인 대시보드의 '내 글 목록'에서 확인할 수 있으며, 언제든지 수정하거나 삭제할 수 있습니다.",
      category: '서비스',
    },
    {
      id: 7,
      question: '다른 사용자의 글을 볼 수 있나요?',
      answer:
        '네, 다른 사용자들이 공개 설정한 글을 볼 수 있습니다. 단, 개인정보 보호를 위해 익명으로 표시됩니다.',
      category: '서비스',
    },
    {
      id: 8,
      question: '서비스 이용료는 얼마인가요?',
      answer:
        '서비스 이용료는 신청서(구글폼)를 통해 확인하실 수 있습니다. 현재 베타 서비스 단계로 운영되고 있으며, 정식 서비스 출시 시 이용료 정책이 공지될 예정입니다.',
      category: '결제',
    },
    {
      id: 9,
      question: '결제 방법은 어떤 것이 있나요?',
      answer:
        '현재 베타 서비스로 무료로 이용 가능합니다. 정식 서비스 출시 시 다양한 결제 방법을 제공할 예정입니다.',
      category: '결제',
    },
    {
      id: 10,
      question: '환불 정책은 어떻게 되나요?',
      answer:
        '현재 베타 서비스로 무료로 이용 가능합니다. 정식 서비스 출시 시 환불 정책이 공지될 예정입니다.',
      category: '결제',
    },
    {
      id: 11,
      question: '기술적 문제가 발생했어요.',
      answer:
        '기술적 문제가 발생했을 때는 고객센터로 문의해 주세요. 문제 해결을 위해 최선을 다하겠습니다.',
      category: '기술지원',
    },
    {
      id: 12,
      question: '개인정보는 어떻게 보호되나요?',
      answer:
        '딜라이팅 AI는 개인정보보호법을 준수하며, 사용자의 개인정보를 안전하게 보호합니다. 자세한 내용은 개인정보처리방침을 참고해 주세요.',
      category: '개인정보',
    },
  ];

  const categories = [
    { id: 'all', name: '전체' },
    { id: '서비스', name: '서비스' },
    { id: '계정', name: '계정' },
    { id: '토큰', name: '토큰' },
    { id: '결제', name: '결제' },
    { id: '지원', name: '지원' },
    { id: '보안', name: '보안' },
  ];

  const filteredFAQs =
    activeCategory === 'all' ? faqData : faqData.filter(faq => faq.category === activeCategory);

  const toggleItem = (id: number) => {
    setOpenItems(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            홈으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h1>
          <p className="text-gray-600 dark:text-gray-300">
            딜라이팅 AI 서비스에 대한 궁금한 점들을 확인해보세요
          </p>
        </motion.div>

        {/* 카테고리 필터 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* FAQ 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredFAQs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openItems.includes(faq.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {openItems.includes(faq.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                      {renderAnswer(faq.answer)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* 추가 문의 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center"
        >
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            더 궁금한 점이 있으신가요?
          </h3>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            위에서 답변을 찾지 못하셨다면 언제든지 문의해 주세요.
          </p>
          <a
            href="https://digiocean.channel.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            문의하기
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;
