import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const CookiePolicy: React.FC = () => {
  useEffect(() => {
    // 페이지 로드 시 맨 위로 스크롤
    window.scrollTo(0, 0);

    // 페이지 로드 시 스크롤 위치 복원 (뒤로가기 시에만)
    const savedScrollPosition = sessionStorage.getItem('cookie-scroll-position');
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
      sessionStorage.setItem('cookie-scroll-position', window.scrollY.toString());
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">쿠키 정책</h1>
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
              1. 쿠키란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              쿠키는 웹사이트가 사용자의 브라우저에 저장하는 작은 텍스트 파일입니다. 쿠키는 사용자의
              선호도, 로그인 상태, 방문 기록 등의 정보를 저장하여 더 나은 사용자 경험을 제공하는 데
              도움을 줍니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. 딜라이팅 AI에서 사용하는 쿠키의 종류
            </h2>
            <div className="space-y-6 mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  2.1. 필수 쿠키 (Essential Cookies)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  웹사이트의 기본 기능을 위해 반드시 필요한 쿠키입니다.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>세션 쿠키:</strong> 로그인 상태 유지 및 보안
                  </li>
                  <li>
                    <strong>언어 설정:</strong> 사용자가 선택한 언어 설정 저장
                  </li>
                  <li>
                    <strong>테마 설정:</strong> 다크모드/라이트모드 설정 저장
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  2.2. 성능 쿠키 (Performance Cookies)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  웹사이트 성능을 분석하고 개선하기 위해 사용되는 쿠키입니다.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>Google Analytics:</strong> 방문자 통계 및 사용자 행동 분석
                  </li>
                  <li>
                    <strong>성능 모니터링:</strong> 페이지 로딩 속도 및 오류 추적
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  2.3. 기능 쿠키 (Functional Cookies)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  사용자 경험을 향상시키기 위한 추가 기능을 제공하는 쿠키입니다.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>편집기 설정:</strong> 글쓰기 편집기의 사용자 설정
                  </li>
                  <li>
                    <strong>알림 설정:</strong> 사용자가 설정한 알림 옵션
                  </li>
                  <li>
                    <strong>최근 활동:</strong> 최근 작성한 글 및 피드백 기록
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  2.4. 마케팅 쿠키 (Marketing Cookies)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  사용자에게 관련성 높은 광고를 제공하기 위해 사용되는 쿠키입니다.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>Google Ads:</strong> 맞춤형 광고 제공
                  </li>
                  <li>
                    <strong>Facebook Pixel:</strong> 소셜 미디어 광고 최적화
                  </li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. 쿠키 보유 기간
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>세션 쿠키:</strong> 브라우저를 닫을 때까지
                </li>
                <li>
                  <strong>영구 쿠키:</strong> 최대 2년 (쿠키 종류에 따라 다름)
                </li>
                <li>
                  <strong>분석 쿠키:</strong> 최대 26개월 (Google Analytics 기준)
                </li>
                <li>
                  <strong>마케팅 쿠키:</strong> 최대 13개월 (광고 플랫폼 기준)
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. 쿠키 관리 방법
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                4.1. 브라우저 설정을 통한 쿠키 관리
              </h3>
              <p>대부분의 웹 브라우저에서 쿠키 설정을 변경할 수 있습니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Chrome:</strong> 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터
                </li>
                <li>
                  <strong>Firefox:</strong> 설정 → 개인정보 및 보안 → 쿠키 및 사이트 데이터
                </li>
                <li>
                  <strong>Safari:</strong> 환경설정 → 개인정보 보호 → 쿠키 및 웹사이트 데이터
                </li>
                <li>
                  <strong>Edge:</strong> 설정 → 쿠키 및 사이트 권한 → 쿠키
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                4.2. 쿠키 동의 관리
              </h3>
              <p>딜라이팅 AI 웹사이트에서 쿠키 동의를 관리할 수 있습니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>웹사이트 하단의 "쿠키 설정" 링크를 통해 쿠키 동의를 변경할 수 있습니다.</li>
                <li>필수 쿠키를 제외한 모든 쿠키는 사용자 동의 후에만 설정됩니다.</li>
                <li>동의를 철회하면 해당 쿠키는 즉시 삭제됩니다.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. 쿠키 사용의 영향
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                5.1. 쿠키를 허용하지 않을 경우
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>로그인 상태가 유지되지 않을 수 있습니다.</li>
                <li>일부 기능이 제대로 작동하지 않을 수 있습니다.</li>
                <li>개인화된 서비스 제공이 제한될 수 있습니다.</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                5.2. 쿠키를 허용할 경우
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>더 나은 사용자 경험을 제공받을 수 있습니다.</li>
                <li>개인화된 콘텐츠 및 추천을 받을 수 있습니다.</li>
                <li>서비스 개선을 위한 데이터 분석이 가능합니다.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. 제3자 쿠키
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              딜라이팅 AI는 다음과 같은 제3자 서비스의 쿠키를 사용할 수 있습니다:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                      서비스명
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                      목적
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
                      개인정보처리방침
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      Google Analytics
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      웹사이트 분석
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Google 개인정보처리방침
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      Google Ads
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      광고 최적화
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Google 개인정보처리방침
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. 쿠키 정책 변경
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              본 쿠키 정책은 법령 및 방침에 따라 변경될 수 있으며, 변경 시 서비스 내 공지사항을 통해
              사용자에게 통지합니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. 문의</h2>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                쿠키 사용에 대한 문의사항이 있으시면 다음 연락처로 문의해 주시기 바랍니다.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
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

export default CookiePolicy;
