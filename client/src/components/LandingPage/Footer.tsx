import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 dark:bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                딜라이팅 AI
              </h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                매일 조금씩, 꾸준함이 만드는 글쓰기 성장의 경험을 제공합니다. AI와 사람들의
                피드백으로 더 깊고 넓은 글쓰기 여정을 함께해보세요.
              </p>
              <div className="flex space-x-4 mb-4">
                <a
                  href="https://www.instagram.com/digioceanofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://www.digiocean.co.kr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </a>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>이메일: hello@digiocean.co.kr</p>
                <p>주소: 인천시 부평구 체육관로 111</p>
                <p>사업자번호: 546-30-00459(디지오션)</p>
                <p>
                  문의하기:{' '}
                  <a
                    href="https://digiocean.channel.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    @https://digiocean.channel.io/
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-200">서비스</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <span className="cursor-not-allowed">300자 글쓰기</span>
              </li>
              <li>
                <span className="cursor-not-allowed">1000자 글쓰기</span>
              </li>
              <li>
                <span className="cursor-not-allowed">AI 피드백</span>
              </li>
              <li>
                <span className="cursor-not-allowed">월간 에세이</span>
              </li>
              <li>
                <span className="cursor-not-allowed">피드백 캠프</span>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gray-200">고객지원</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-white transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <a
                  href="https://digiocean.channel.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  문의하기
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 딜라이팅 AI. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link to="/terms-of-service" className="hover:text-white transition-colors">
                이용약관
              </Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">
                개인정보처리방침
              </Link>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">
                쿠키 정책
              </Link>
            </div>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>
            딜라이팅 AI는 글쓰기 성장을 위한 AI 기반 플랫폼입니다.
            <br />
            매일 조금씩, 꾸준함이 만드는 변화를 경험해보세요.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
