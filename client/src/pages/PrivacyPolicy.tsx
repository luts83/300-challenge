import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            개인정보처리방침
          </h1>
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
              1. 개인정보 수집 목적
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>딜라이팅 AI는 다음과 같은 목적으로 개인정보를 수집합니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>서비스 제공 및 계정 관리</li>
                <li>AI 피드백 생성 및 개인화된 서비스 제공</li>
                <li>고객 지원 및 문의 응답</li>
                <li>서비스 개선 및 신규 서비스 개발</li>
                <li>마케팅 및 광고 (사용자 동의 시)</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. 수집하는 개인정보 항목
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                2.1. 필수 수집 항목
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>이메일 주소:</strong> 계정 생성 및 서비스 이용을 위한 필수 정보
                </li>
                <li>
                  <strong>닉네임:</strong> 서비스 내 사용자 식별 및 커뮤니티 활동
                </li>
                <li>
                  <strong>작성한 글:</strong> AI 피드백 생성 및 서비스 제공
                </li>
                <li>
                  <strong>서비스 이용 기록:</strong> 서비스 개선 및 개인화
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                2.2. 선택 수집 항목
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>프로필 이미지:</strong> 사용자 프로필 커스터마이징
                </li>
                <li>
                  <strong>관심 분야:</strong> 맞춤형 콘텐츠 및 주제 추천
                </li>
                <li>
                  <strong>마케팅 정보 수신 동의:</strong> 새로운 서비스 및 이벤트 안내
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. 개인정보 보유 및 이용기간
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>3.1. 회원 탈퇴 시까지 (단, 관련 법령에 따라 보존이 필요한 경우 해당 기간까지)</p>
              <p>
                3.2. 작성한 글은 서비스 개선 및 AI 학습을 위해 탈퇴 후에도 익명화하여 보관될 수
                있습니다.
              </p>
              <p>3.3. 계정 비활성화 후 1년이 경과하면 자동으로 삭제됩니다.</p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. 개인정보 제3자 제공
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>4.1. 딜라이팅 AI는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
              <p>4.2. 다음의 경우에만 개인정보를 제공할 수 있습니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>사용자가 사전에 동의한 경우</li>
                <li>법령에 의해 요구되는 경우</li>
                <li>수사기관의 수사목적으로 법령에 정해진 절차에 따라 요구되는 경우</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. 개인정보 처리 위탁
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>5.1. 서비스 제공을 위해 다음과 같은 업무를 외부 전문업체에 위탁할 수 있습니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>클라우드 서비스:</strong> AWS, Google Cloud Platform
                </li>
                <li>
                  <strong>이메일 서비스:</strong> 고객 지원 및 알림 발송
                </li>
                <li>
                  <strong>분석 서비스:</strong> 서비스 이용 통계 및 개선
                </li>
              </ul>
              <p>5.2. 위탁업체와는 개인정보 보호를 위한 계약을 체결하고 관리합니다.</p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. 개인정보의 안전성 확보 조치
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>암호화:</strong> 개인정보는 암호화하여 저장 및 전송
                </li>
                <li>
                  <strong>접근 제한:</strong> 개인정보에 대한 접근 권한을 최소한으로 제한
                </li>
                <li>
                  <strong>보안 감사:</strong> 정기적인 보안 점검 및 취약점 조사
                </li>
                <li>
                  <strong>직원 교육:</strong> 개인정보 보호 관련 정기 교육 실시
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. 개인정보 주체의 권리
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-6">
              <p>사용자는 다음과 같은 권리를 가집니다:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>열람권:</strong> 자신의 개인정보에 대한 열람 요구
                </li>
                <li>
                  <strong>정정·삭제권:</strong> 개인정보의 정정 또는 삭제 요구
                </li>
                <li>
                  <strong>처리정지권:</strong> 개인정보 처리의 정지 요구
                </li>
                <li>
                  <strong>이동권:</strong> 개인정보의 이전 요구
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. 쿠키 및 유사 기술 사용
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              서비스 이용을 위해 쿠키 및 유사 기술을 사용합니다. 자세한 내용은
              <Link
                to="/cookie-policy"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                쿠키 정책
              </Link>
              을 참조하시기 바랍니다.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. 개인정보 보호책임자
            </h2>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>개인정보 보호책임자</strong>
                <br />
                이메일: hello@digiocean.co.kr
                <br />
                주소: 인천시 부평구 체육관로 111
                <br />
                사업자번호: 546-30-00459(디지오션)
                <br />
                문의하기:{' '}
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

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. 개인정보처리방침 변경
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              본 개인정보처리방침은 법령 및 방침에 따라 변경될 수 있으며, 변경 시 서비스 내
              공지사항을 통해 사용자에게 통지합니다.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
