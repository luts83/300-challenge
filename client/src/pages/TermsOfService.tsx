import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
  useEffect(() => {
    // 페이지 로드 시 맨 위로 스크롤
    window.scrollTo(0, 0);

    // 페이지 로드 시 스크롤 위치 복원 (뒤로가기 시에만)
    const savedScrollPosition = sessionStorage.getItem('terms-scroll-position');
    if (
      savedScrollPosition &&
      window.history.state &&
      window.history.state.usr &&
      window.history.state.usr.fromBack
    ) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
      }, 100);
    }
  }, []);

  // 페이지 떠날 때 스크롤 위치 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('terms-scroll-position', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">이용약관</h1>
          <p className="text-gray-600 dark:text-gray-300">최종 업데이트: 2025년 8월 1일</p>
        </motion.div>

        {/* 본문 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
        >
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. 서비스 개요
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              딜라이팅 AI는 AI 기반 글쓰기 플랫폼으로, 사용자들이 매일 글을 쓰고 AI 피드백을 받으며
              글쓰기 실력을 향상시킬 수 있도록 도와주는 서비스입니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. 서비스 이용
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>2.1. 서비스 이용을 위해서는 회원가입이 필요하며, 본 약관에 동의해야 합니다.</p>
              <p>
                2.2. 사용자는 매일 지정된 주제에 따라 글을 작성하고 AI 피드백을 받을 수 있습니다.
              </p>
              <p>
                2.3. 서비스 이용 중 타인을 비방하거나 불법적인 내용을 게시하는 행위는 금지됩니다.
              </p>
              <p>
                2.4. 사용자는 자신의 계정 정보를 안전하게 보관해야 하며, 타인에게 공유해서는 안
                됩니다.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. 지적재산권
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>3.1. 딜라이팅 AI의 모든 콘텐츠, 디자인, 로고 등은 회사의 지적재산권에 속합니다.</p>
              <p>3.2. 사용자가 작성한 글의 저작권은 해당 사용자에게 있습니다.</p>
              <p>
                3.3. AI가 생성한 피드백의 저작권은 회사에 있으며, 개인적인 용도로만 사용 가능합니다.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. 개인정보 보호
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              개인정보의 수집, 이용, 보관에 관한 사항은 별도의 개인정보처리방침에 따릅니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. 서비스 중단 및 변경
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>
                5.1. 회사는 서비스 개선, 시스템 점검 등을 위해 서비스를 일시 중단할 수 있습니다.
              </p>
              <p>5.2. 서비스 중단 시 사전 공지하되, 긴급한 경우 사후 공지할 수 있습니다.</p>
              <p>5.3. 회사는 서비스 내용을 변경할 수 있으며, 변경 시 사용자에게 공지합니다.</p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. 책임 제한
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>6.1. 회사는 서비스 이용으로 인한 직접적, 간접적 손해에 대해 책임지지 않습니다.</p>
              <p>6.2. 사용자가 작성한 글의 내용에 대한 책임은 해당 사용자에게 있습니다.</p>
              <p>6.3. AI 피드백은 참고용이며, 그 정확성을 보장하지 않습니다.</p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. 약관 변경
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 공지사항을 통해 사용자에게
              통지합니다. 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. 문의 및 연락처
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              본 약관에 대한 문의사항이 있으시면 다음 연락처로 문의해 주시기 바랍니다.
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>이메일:</strong> hello@digiocean.co.kr
                <br />
                <strong>문의하기:</strong>{' '}
                <a
                  href="https://digiocean.channel.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  https://digiocean.channel.io/
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
