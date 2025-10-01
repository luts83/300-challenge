import React from 'react';
import { useUser } from '../context/UserContext';
import Layout from '../components/Layout';
import GrowthDashboard from '../components/GrowthDashboard';
import FeedbackApplicationTracker from '../components/FeedbackApplicationTracker';
import GrowthIndicators from '../components/GrowthIndicators';
import WeeklyGrowthReport from '../components/WeeklyGrowthReport';
import ScrollToTop from '../components/ScrollToTop';

const GrowthPage: React.FC = () => {
  const { user, isAdmin } = useUser();

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              로그인이 필요합니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              성장 대시보드를 보려면 먼저 로그인해주세요.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">404</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400">요청하신 페이지가 존재하지 않습니다.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-8">
          <GrowthDashboard />
          <FeedbackApplicationTracker />
          <GrowthIndicators />
          <WeeklyGrowthReport />
        </div>
      </div>
      <ScrollToTop />
    </Layout>
  );
};

export default GrowthPage;
