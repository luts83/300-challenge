// 관리자 대시보드 컴포넌트 (React + Tailwind + TypeScript)

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { convertUTCToUserTime, getLocationByTimezone } from '../utils/timezoneUtils';
import { isAdmin } from '../utils/admin';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ScrollToTop from '../components/ScrollToTop';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VirtualizedUserList from '../components/VirtualizedUserList';
import VirtualizedTopicRanking from '../components/VirtualizedTopicRanking';
import ErrorBoundary from '../components/ErrorBoundary';
import { toast } from 'react-hot-toast';

// 스켈레톤 UI 컴포넌트
const DashboardSkeleton = () => (
  <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
    {/* 제목 스켈레톤 */}
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48 mx-auto"></div>

    {/* 통계 카드 스켈레톤 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ))}
    </div>

    {/* 필터 섹션 스켈레톤 */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
      </div>
    </div>

    {/* 제출물 목록 스켈레톤 */}
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2 w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
        </div>
      ))}
    </div>
  </div>
);

interface User {
  uid: string;
  displayName: string;
  email: string;
}

interface UserProfile {
  email: string;
  displayName: string;
  writingStats: {
    mode_300: {
      averageScore: number;
      scoreTrend: string;
      strengthAreas: string[];
      weaknessAreas: string[];
      writingFrequency: number;
      preferredTopics: string[];
      commonMistakes: string[];
    };
    mode_1000: {
      averageScore: number;
      scoreTrend: string;
      strengthAreas: string[];
      weaknessAreas: string[];
      writingFrequency: number;
      preferredTopics: string[];
      commonMistakes: string[];
    };
  };
}

interface Feedback {
  _id: string;
  toSubmissionId: string;
  submissionTitle: string;
  content: string;
  fromUser: {
    displayName: string;
    email: string;
  };
  writtenDate: string;
  createdAt: string;
  // 작성자 시간대 정보 (선택)
  fromUserTimezone?: string;
  fromUserOffset?: number;
}

interface Submission {
  _id: string;
  title: string;
  topic: string;
  text: string;
  mode: 'mode_300' | 'mode_1000';
  user: {
    uid: string;
    displayName: string;
    email: string;
  };
  sessionCount: number;
  duration: number;
  submissionDate: string;
  createdAt: string;
  score: number;
  feedbackUnlocked: boolean;
  feedbackCount: number;
  feedbacks: Feedback[];
  userTimezone?: string;
  userTimezoneOffset?: number;
}

interface RankingItem {
  user: {
    displayName: string;
    uid: string;
  };
  score?: number;
  feedbackCount?: number;
  submissionCount?: number;
}

interface RankingStats {
  scoreRanking: {
    mode300: RankingItem[];
    mode1000: RankingItem[];
  };
  feedbackRanking: {
    received: RankingItem[];
    given: RankingItem[];
  };
  likeRanking: {
    user: {
      displayName: string;
      uid: string;
    };
    likeCount: number;
  }[];
  likeReceivedRanking?: {
    user: {
      displayName: string;
      uid: string;
    };
    likeCount: number;
  }[];
}

const RankingSection: React.FC<{
  rankings: RankingStats;
  likeReceivedRanking: {
    user: {
      displayName: string;
      uid: string;
    };
    likeCount: number;
  }[];
}> = ({ rankings, likeReceivedRanking }) => {
  const [activeTab, setActiveTab] = useState<'300' | '1000'>('300');

  return (
    <div className="mb-6">
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-full overflow-x-hidden">
          {/* 점수 랭킹 */}
          <div className="p-2 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
              <h3 className="text-lg font-semibold mb-2 sm:mb-0">평균 점수 랭킹</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded ${
                    activeTab === '300'
                      ? 'bg-blue-500 text-white dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                  onClick={() => setActiveTab('300')}
                >
                  300자
                </button>
                <button
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded ${
                    activeTab === '1000'
                      ? 'bg-blue-500 text-white dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                  onClick={() => setActiveTab('1000')}
                >
                  1000자
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {(activeTab === '300'
                ? rankings.scoreRanking.mode300
                : rankings.scoreRanking.mode1000
              ).map((rank, index) => (
                <div
                  key={rank.user.uid}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full
                      ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100'
                          : index === 1
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                              : 'text-gray-500 dark:text-gray-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>{rank.user.displayName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{rank.score}점</span>
                    <span className="text-xs text-gray-500 ml-1">({rank.submissionCount}회)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 받은 피드백 랭킹 */}
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4">받은 피드백 랭킹</h3>
            <div className="space-y-2">
              {rankings.feedbackRanking.received.map((rank, index) => (
                <div
                  key={rank.user.uid}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full
                      ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100'
                          : index === 1
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                              : 'text-gray-500 dark:text-gray-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>{rank.user.displayName}</span>
                  </div>
                  <span className="font-semibold">{rank.feedbackCount}개</span>
                </div>
              ))}
            </div>
          </div>

          {/* 작성한 피드백 랭킹 */}
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4">작성한 피드백 랭킹</h3>
            <div className="space-y-2">
              {rankings.feedbackRanking.given.map((rank, index) => (
                <div
                  key={rank.user.uid}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full
                      ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100'
                          : index === 1
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                              : 'text-gray-500 dark:text-gray-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>{rank.user.displayName}</span>
                  </div>
                  <span className="font-semibold">{rank.feedbackCount}개</span>
                </div>
              ))}
            </div>
          </div>
          {/* 좋아요 수 랭킹 */}
          {/* <div>
            <h3 className="text-lg font-semibold mb-4">좋아요 수 랭킹</h3>
            <div className="space-y-2">
              {rankings.likeRanking.map((rank, index) => (
                <div
                  key={rank.user.uid}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full
            ${
              index === 0
                ? 'bg-yellow-100 text-yellow-700'
                : index === 1
                  ? 'bg-gray-100 text-gray-700'
                  : index === 2
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500'
            }`}
                    >
                      {index + 1}
                    </span>
                    <span>{rank.user.displayName}</span>
                  </div>
                  <span className="font-semibold">{rank.likeCount}개</span>
                </div>
              ))}
            </div>
          </div> */}
          {/* 좋아요 받은 랭킹 */}
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4">💖 좋아요 받은 랭킹</h3>
            <div className="space-y-2">
              {likeReceivedRanking.map((rank, index) => (
                <div
                  key={rank.user.uid}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full
            ${
              index === 0
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100'
                : index === 1
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                  : index === 2
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                    : 'text-gray-500 dark:text-gray-100'
            }`}
                    >
                      {index + 1}
                    </span>
                    <span>{rank.user.displayName}</span>
                  </div>
                  <span className="font-semibold">{rank.likeCount}개</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = `
  .react-datepicker__day--highlighted {
    background-color: #4CAF50 !important;
    color: white !important;
    border-radius: 50% !important;
  }
  
  .react-datepicker__day--highlighted:hover {
    background-color: #45a049 !important;
  }

  .highlighted {
    background-color: #4CAF50 !important;
    color: white !important;
    border-radius: 50% !important;
  }

  .react-datepicker__day.highlighted {
    background-color: #4CAF50 !important;
    color: white !important;
    border-radius: 50% !important;
  }
`;

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  // 상태 선언을 먼저
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentDateTopic, setCurrentDateTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<
    Array<{ uid: string; displayName: string; email: string; submissionCount?: number }>
  >([]);
  const [filteredUsers, setFilteredUsers] = useState<
    Array<{
      uid: string;
      displayName: string;
      email: string;
      submissionCount?: number;
      lastSubmission?: string;
    }>
  >([]);
  const [userPagination, setUserPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stableSubmissions, setStableSubmissions] = useState<Submission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    averageScore: number;
    totalFeedbacks: number;
    submissionsToday: number;
    userProfile?: UserProfile;
  } | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminSubmissions, setAdminSubmissions] = useState<Submission[]>([]);
  const [likeReceivedRanking, setLikeReceivedRanking] = useState<
    { user: { displayName: string; uid: string }; likeCount: number }[]
  >([]);
  const [topicRanking, setTopicRanking] = useState<
    {
      topic: string;
      mode: 'mode_300' | 'mode_1000';
      submissionCount: number;
      averageScore: number;
      uniqueUsers: number;
      lastSubmission: string;
    }[]
  >([]);
  const [topicPagination, setTopicPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
    limit: 50,
  });
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [topicModeFilter, setTopicModeFilter] = useState<'all' | 'mode_300' | 'mode_1000'>('all');
  const [topicLoading, setTopicLoading] = useState(false);
  const [rankings, setRankings] = useState<RankingStats>({
    scoreRanking: {
      mode300: [],
      mode1000: [],
    },
    feedbackRanking: {
      received: [],
      given: [],
    },
    likeRanking: [],
  });
  const [submissionDates, setSubmissionDates] = useState<Date[]>([]);
  const [displayCount, setDisplayCount] = useState(5); // 모바일에서는 5개만 표시
  const ITEMS_PER_PAGE = 5; // 모바일 최적화
  const [submissionsPagination, setSubmissionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const start = startDate || new Date(1970, 0, 1);
        const end = endDate || new Date();

        // 인증 토큰 가져오기
        const token = await user?.getIdToken();
        if (!token) {
          setError('인증 토큰을 가져올 수 없습니다.');
          setLoading(false);
          return;
        }

        const chartRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/weekly?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setSubmissions(chartRes.data);

        // 주제 랭킹은 비동기로 호출 (로딩 블로킹 방지)
        fetchTopicRanking(1, '').catch(error => {
          // 주제 랭킹 로딩 실패는 무시
        });
      } catch (error) {
        setError('데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    if (user && !isAdmin(user.uid)) {
      navigate('/'); // 비관리자는 홈으로 리디렉션
    }
  }, [user, navigate]);

  // 모든 데이터 가져오기 (페이지네이션 지원)
  const fetchAllData = async (
    start?: Date | null,
    end?: Date | null,
    userId?: string,
    page = 1
  ) => {
    if (!user && !userId) return;

    // 첫 페이지가 아닌 경우에만 로딩 상태 설정
    if (page === 1) {
      setLoading(true);
    }

    try {
      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        setError('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const params: any = {
        page,
        // 관리자 전체 보기에서는 더 큰 limit로 네트워크 요청 수를 줄임
        limit: userId ? 50 : 200,
      };
      if (start) params.start = format(start, 'yyyy-MM-dd');
      if (end) params.end = format(end, 'yyyy-MM-dd');

      // API 호출 시 선택된 사용자의 UID 사용
      const targetUid = userId || user?.uid;

      // UID 유효성 검증
      if (!targetUid || targetUid === '$' || targetUid.trim() === '') {
        console.error('Invalid UID:', targetUid);
        setError('유효하지 않은 사용자 ID입니다.');
        return;
      }

      // 인증 헤더 설정
      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      // 병렬로 API 호출하여 성능 향상
      const [submissionsRes, statsRes, rankingsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/all-submissions/${targetUid}`, {
          headers: authHeaders,
          params: {
            ...params,
            // 특정 사용자 미선택(관리자 전체 보기) 시 전체 조회 플래그 전달
            adminView: userId ? undefined : 'true',
          },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats/${targetUid}`, {
          headers: authHeaders,
          params,
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings`, {
          headers: authHeaders,
          params,
        }),
      ]);

      // 페이지네이션 응답 처리
      if (page === 1) {
        setSubmissions(submissionsRes.data.submissions || submissionsRes.data);
        setStableSubmissions(
          (submissionsRes.data.submissions || submissionsRes.data).map((sub: Submission) => ({
            ...sub,
            userTimezone: sub.userTimezone || 'Asia/Seoul',
          }))
        );
        if (submissionsRes.data.pagination) {
          setSubmissionsPagination({
            currentPage: submissionsRes.data.pagination.currentPage,
            totalPages: submissionsRes.data.pagination.totalPages,
            hasMore: submissionsRes.data.pagination.hasMore,
          });
        } else {
          setSubmissionsPagination({ currentPage: 1, totalPages: 1, hasMore: false });
        }
      } else {
        // 추가 페이지 로드
        setSubmissions(prev => [...prev, ...(submissionsRes.data.submissions || [])]);
        setStableSubmissions(prev => [
          ...prev,
          ...(submissionsRes.data.submissions || []).map((sub: Submission) => ({
            ...sub,
            userTimezone: sub.userTimezone || 'Asia/Seoul',
          })),
        ]);
        if (submissionsRes.data.pagination) {
          setSubmissionsPagination({
            currentPage: submissionsRes.data.pagination.currentPage,
            totalPages: submissionsRes.data.pagination.totalPages,
            hasMore: submissionsRes.data.pagination.hasMore,
          });
        }
      }

      setStats(statsRes.data);
      setRankings(rankingsRes.data);

      // 주제 랭킹도 함께 업데이트 (비동기로 처리하여 메인 로딩에 영향 없게)
      if (page === 1) {
        fetchTopicRanking(1, topicSearchTerm, topicModeFilter);
      }
    } catch (e) {
      setError('데이터 불러오기 실패');
    } finally {
      if (page === 1) {
        setLoading(false);
      }
    }
  };

  // 초기 로딩 - 오늘 날짜로 초기화
  useEffect(() => {
    if (user) {
      const today = new Date();
      setStartDate(today);
      setEndDate(today);
      fetchAllData(today, today, undefined, 1);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTopicRanking();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchLikesReceived = async () => {
      try {
        // 인증 토큰 가져오기
        const token = await user?.getIdToken();
        if (!token) {
          console.error('인증 토큰을 가져올 수 없습니다.');
          return;
        }

        const authHeaders = {
          Authorization: `Bearer ${token}`,
        };

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/rankings/likes-received`,
          { headers: authHeaders }
        );
        setLikeReceivedRanking(res.data.likeReceivedRanking);
      } catch (err) {
        // 좋아요 받은 랭킹 로딩 실패는 무시
        console.error('좋아요 받은 랭킹 조회 실패:', err);
      }
    };

    if (user) {
      fetchLikesReceived();
    }
  }, [user]);

  // 사용자 선택 시
  const handleUserChange = (uid: string) => {
    setSelectedUser(uid);
    // 선택된 사용자의 데이터만 가져오도록 fetchAllData 호출
    if (uid) {
      // 특정 사용자 선택 시
      fetchAllData(startDate, endDate, uid, 1);
    } else {
      // "모든 사용자" 선택 시
      fetchAllData(startDate, endDate, undefined, 1);
    }
  };

  // 날짜/시간 포맷팅 함수
  const formatDateTime = (
    dateString: string,
    userTimezone?: string,
    userTimezoneOffset?: number
  ) => {
    try {
      const date = new Date(dateString);

      if (userTimezone) {
        try {
          const userTime = toZonedTime(date, userTimezone);
          return formatTz(userTime, 'yyyy년 M월 d일 a h시 mm분', {
            timeZone: userTimezone,
          });
        } catch (error) {
          const userTime = convertUTCToUserTime(
            dateString,
            userTimezone,
            userTimezoneOffset ?? -540
          );
          return format(userTime, 'yyyy년 M월 d일 a h시 mm분');
        }
      }

      // 시간대 정보가 없으면 기본 포맷
      return format(date, 'yyyy년 M월 d일 a h시 mm분');
    } catch (error) {
      return format(new Date(dateString), 'yyyy년 M월 d일 a h시 mm분');
    }
  };

  // 작성 위치 정보 포맷팅 함수
  const formatLocation = (userTimezone?: string) => {
    if (!userTimezone) return '';
    return getLocationByTimezone(userTimezone);
  };

  // 소요 시간 포맷팅 함수 추가
  const formatDuration = (duration: number | string) => {
    const durationNum = Number(duration);
    if (isNaN(durationNum)) return '시간 정보 없음';

    const minutes = Math.floor(durationNum / 60);
    const seconds = durationNum % 60;
    return `${minutes}분 ${seconds}초`;
  };

  // 관리자 뷰 토글 함수
  const toggleAdminView = () => {
    setIsAdminView(!isAdminView);
    fetchAllData(startDate, endDate, undefined, 1);
  };

  // 주제별 랭킹 조회
  const fetchTopicRanking = async (
    page = 1,
    search = '',
    mode = 'all' as 'all' | 'mode_300' | 'mode_1000'
  ) => {
    try {
      setTopicLoading(true);

      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        setError('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      const params: any = {
        page,
        limit: topicPagination.limit,
      };
      if (search) params.search = search;
      if (mode !== 'all') params.mode = mode;

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings/topics`, {
        headers: authHeaders,
        params,
      });

      if (page === 1) {
        setTopicRanking(res.data.topicRanking || []);
        setTopicPagination({
          ...topicPagination,
          page: res.data.pagination?.page || 1,
          total: res.data.pagination?.total || 0,
          totalPages: res.data.pagination?.totalPages || 1,
          hasNext: res.data.pagination?.hasNext || false,
        });
      } else {
        setTopicRanking(prev => [...prev, ...(res.data.topicRanking || [])]);
      }
    } catch (error) {
      console.error('주제 랭킹 조회 실패:', error);
      setError('주제 랭킹을 불러오는데 실패했습니다.');
    } finally {
      setTopicLoading(false);
    }
  };

  // 더보기 버튼 클릭 핸들러 추가
  const handleLoadMore = () => {
    if (submissionsPagination.hasMore) {
      // 서버에서 다음 페이지를 가져와 누적
      fetchAllData(
        startDate,
        endDate,
        selectedUser || undefined,
        submissionsPagination.currentPage + 1
      );
    } else {
      // 남은 항목이 화면에 안 보이는 경우를 대비해 로컬 카운트 증가
      setDisplayCount(prev => prev + ITEMS_PER_PAGE);
    }
  };

  // 필터링된 제출물을 계산하는 부분 수정
  const filteredSubmissions = selectedUser
    ? stableSubmissions.filter(sub => sub.user.uid === selectedUser)
    : stableSubmissions;

  // 표시할 제출물만 선택
  const displayedSubmissions = filteredSubmissions; // 서버 페이지네이션으로 누적 표시

  // 날짜 유틸 함수
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일 시작
    return new Date(d.setDate(diff));
  };

  const handleThisWeek = () => {
    const now = new Date();
    const start = getStartOfWeek(now);
    setStartDate(start);
    setEndDate(now);
    fetchAllData(start, now, undefined, 1);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(first);
    setEndDate(now);
    fetchAllData(first, now, undefined, 1);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    fetchAllData(undefined, undefined, undefined, 1);
  };

  // 사용자 목록을 가져오는 함수 추가 (페이지네이션 지원)
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setUserLoading(true);

      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        toast.error('인증 토큰을 가져올 수 없습니다.');
        setUserLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
      });

      if (search) {
        params.append('search', search);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/stats/users?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (page === 1) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        setUsers(prev => [...prev, ...response.data.users]);
        setFilteredUsers(prev => [...prev, ...response.data.users]);
      }

      setUserPagination(response.data.pagination);
    } catch (error) {
      toast.error('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 작성된 날짜를 가져오는 함수 수정
  const fetchSubmissionDates = async () => {
    try {
      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/submission-dates`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const dates = response.data.dates.map((dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      });

      setSubmissionDates(dates);
    } catch (error) {
      // 작성 날짜 목록 로딩 실패는 무시
    }
  };

  // 특정 날짜의 주제 가져오기
  const fetchDateTopic = async (date: Date) => {
    try {
      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        return null;
      }

      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/topic/${dateStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return res.data.topic;
    } catch (error) {
      return null;
    }
  };

  // 현재 날짜의 주제 가져오기
  const fetchCurrentDateTopic = async () => {
    try {
      // 인증 토큰 가져오기
      const token = await user?.getIdToken();
      if (!token) {
        console.error('인증 토큰을 가져올 수 없습니다.');
        setCurrentDateTopic(null);
        return;
      }

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/topic/today?mode=mode_300&timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCurrentDateTopic(res.data.topic);
    } catch (error) {
      setCurrentDateTopic(null);
    }
  };

  // useEffect 수정 - 오늘 날짜로 초기화
  useEffect(() => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);

    fetchUsers();
    fetchAllData(today, today);
    fetchSubmissionDates();
    fetchCurrentDateTopic();
  }, []);

  // 스타일 적용
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <Layout>
      <div className="overflow-x-hidden max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0">
            {isAdminView ? '관리자 대시보드' : '작성 현황'}
          </h1>
        </div>

        {/* 로딩 상태 표시 */}
        {loading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-blue-800 font-medium">데이터를 불러오는 중...</p>
                <p className="text-blue-600 text-sm">잠시만 기다려주세요</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <DatePicker
                selected={startDate}
                onChange={async date => {
                  if (date) {
                    setStartDate(date);
                    setEndDate(date);
                    fetchAllData(date, date);
                    // 주제 랭킹도 함께 업데이트
                    fetchTopicRanking(1, topicSearchTerm, topicModeFilter);

                    // 선택된 날짜의 주제 가져오기
                    const dateTopic = await fetchDateTopic(date);
                    if (dateTopic) {
                      setCurrentDateTopic(dateTopic);
                    }
                  }
                }}
                dateFormat="yyyy-MM-dd"
                placeholderText="날짜 선택"
                className="px-3 py-1 border rounded text-sm dark:bg-gray-900 dark:text-white"
                highlightDates={submissionDates}
                calendarClassName="dark:bg-gray-800"
                dayClassName={date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isHighlighted = submissionDates.some(
                    d => format(d, 'yyyy-MM-dd') === dateStr
                  );
                  return isHighlighted ? 'highlighted' : '';
                }}
              />
              <button
                onClick={() => {
                  fetchAllData();
                  fetchTopicRanking(1, topicSearchTerm, topicModeFilter);
                }}
                className="btn-filter"
              >
                조회
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  handleThisWeek();
                  fetchTopicRanking(1, topicSearchTerm, topicModeFilter);
                }}
                className="btn-filter"
              >
                이번 주
              </button>
              <button
                onClick={() => {
                  handleThisMonth();
                  fetchTopicRanking(1, topicSearchTerm, topicModeFilter);
                }}
                className="btn-filter"
              >
                이번 달
              </button>
              <button
                onClick={() => {
                  handleClear();
                  fetchTopicRanking(1, topicSearchTerm, topicModeFilter);
                }}
                className="btn-filter"
              >
                전체 보기
              </button>
            </div>
          </div>

          {currentDateTopic && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded dark:bg-yellow-900 dark:border-yellow-700">
              <p className="text-gray-500 dark:text-gray-300">
                📅{' '}
                <strong>
                  {startDate
                    ? format(startDate, 'yyyy년 MM월 dd일')
                    : format(new Date(), 'yyyy년 MM월 dd일')}
                </strong>
                의 대표 주제는
                <span className="mx-1 font-semibold">{currentDateTopic}</span>입니다.
              </p>
            </div>
          )}
        </div>

        {isAdminView ? (
          // 관리자 뷰
          <ErrorBoundary>
            <div className="space-y-4 sm:space-y-6">
              {displayedSubmissions.map(submission => (
                <div
                  key={submission._id}
                  className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6"
                >
                  {/* 제출물 헤더 */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
                      <div className="w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-semibold">{submission.title}</h2>
                          {submission.topic && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {submission.topic}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          작성자: {submission.user.displayName}
                        </p>
                        <p className="text-sm text-gray-400 hidden sm:block">
                          ({submission.user.email})
                        </p>
                        <p className="text-sm text-gray-400">
                          작성 시간:{' '}
                          {formatDateTime(
                            submission.createdAt,
                            submission.userTimezone,
                            submission.userTimezoneOffset
                          )}
                          {submission.userTimezone && (
                            <span className="ml-2 text-gray-500">
                              {formatLocation(submission.userTimezone)}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">
                          글자수: {submission.text.length}자 | 작성 시간:{' '}
                          {formatDuration(submission.duration)} | 세션 수: {submission.sessionCount}
                          회
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                            submission.mode === 'mode_300'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {submission.mode === 'mode_300' ? '300자' : '1000자'}
                        </span>
                        <div className="text-right">
                          <p className="font-semibold text-base sm:text-lg">
                            {submission.score !== undefined ? `${submission.score}점` : '미평가'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 글 내용 */}
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">내용</h3>
                    <p className="whitespace-pre-wrap bg-gray-50 p-2 sm:p-4 rounded text-sm sm:text-base">
                      {submission.text}
                    </p>
                  </div>

                  {/* 피드백 섹션 */}
                  <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
                      받은 피드백 ({submission.feedbackCount || 0})
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {submission.feedbacks?.map(feedback => (
                        <div
                          key={feedback._id}
                          className="bg-gray-50 p-2 sm:p-4 rounded-lg shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2 mb-2">
                            <div>
                              <p className="font-medium text-sm sm:text-base">
                                {feedback.fromUser.displayName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400">
                                {feedback.fromUser.email}
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {formatDateTime(
                                feedback.createdAt,
                                feedback.fromUserTimezone || submission.userTimezone,
                                feedback.fromUserOffset ?? submission.userTimezoneOffset
                              )}
                            </p>
                          </div>
                          <p className="mt-2 text-sm sm:text-base text-gray-700 whitespace-pre-wrap">
                            {feedback.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ErrorBoundary>
        ) : (
          <>
            <RankingSection rankings={rankings} likeReceivedRanking={likeReceivedRanking} />

            {/* 🔥 주제별 랭킹 섹션 */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-3">🔥 주제별 랭킹</h3>

                {/* 검색 및 필터 기능 - 모바일 친화적 레이아웃 */}
                <div className="space-y-3">
                  {/* 검색 기능 */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="주제 검색..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      value={topicSearchTerm}
                      onChange={e => {
                        const searchTerm = e.target.value;
                        setTopicSearchTerm(searchTerm);
                      }}
                    />
                    <button
                      onClick={() => fetchTopicRanking(1, topicSearchTerm)}
                      className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors whitespace-nowrap"
                    >
                      검색
                    </button>
                  </div>

                  {/* 모드별 필터 버튼 - 모바일에서 세로 배치 */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setTopicModeFilter('all');
                        fetchTopicRanking(1, topicSearchTerm, 'all');
                      }}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm transition-colors ${
                        topicModeFilter === 'all'
                          ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      전체
                    </button>
                    <button
                      onClick={() => {
                        setTopicModeFilter('mode_300');
                        fetchTopicRanking(1, topicSearchTerm, 'mode_300');
                      }}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm transition-colors ${
                        topicModeFilter === 'mode_300'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
                      }`}
                    >
                      🟢 300자
                    </button>
                    <button
                      onClick={() => {
                        setTopicModeFilter('mode_1000');
                        fetchTopicRanking(1, topicSearchTerm, 'mode_1000');
                      }}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm transition-colors ${
                        topicModeFilter === 'mode_1000'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
                      }`}
                    >
                      🔵 1000자
                    </button>
                  </div>
                </div>
              </div>

              {/* 주제 랭킹 리스트 (모드별 구분 및 무한 스크롤) */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                {topicRanking.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {topicRanking.map((topic, index) => {
                      const averageScore =
                        typeof topic.averageScore === 'number' && !isNaN(topic.averageScore)
                          ? topic.averageScore
                          : 0;
                      const scoreColor =
                        averageScore >= 80
                          ? 'text-green-600'
                          : averageScore >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600';

                      return (
                        <div
                          key={`${topic.topic}-${index}`}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedTopic === topic.topic
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedTopic(topic.topic)}
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                  {topic.mode === 'mode_300' ? '🟢 300자' : '🔵 1000자'}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 whitespace-nowrap">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                {topic.topic}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-2">
                              <span className={`text-lg font-bold ${scoreColor}`}>
                                {(averageScore || 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">점</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="whitespace-nowrap">
                                📝 {topic.submissionCount || 0}개 글
                              </span>
                              <span className="whitespace-nowrap">
                                👥 {topic.uniqueUsers || 0}명 참여
                              </span>
                            </div>
                            <div className="text-xs whitespace-nowrap">
                              {topic.lastSubmission
                                ? new Date(topic.lastSubmission).toLocaleDateString('ko-KR')
                                : '날짜 없음'}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* 더 보기 버튼 */}
                    {topicPagination.hasNext && (
                      <div className="text-center py-4">
                        <button
                          onClick={() =>
                            fetchTopicRanking(
                              topicPagination.page + 1,
                              topicSearchTerm,
                              topicModeFilter
                            )
                          }
                          disabled={topicLoading}
                          className="w-full sm:w-auto px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                        >
                          {topicLoading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              로딩 중...
                            </div>
                          ) : (
                            `더 보기 (+${topicPagination.limit}개)`
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {topicLoading ? '주제 랭킹을 불러오는 중...' : '주제 랭킹이 없습니다.'}
                  </div>
                )}
              </div>

              {/* 주제 통계 정보 */}
              {topicPagination.total > 0 && (
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span>
                      {topicModeFilter === 'all'
                        ? '전체'
                        : topicModeFilter === 'mode_300'
                          ? '🟢 300자'
                          : '🔵 1000자'}{' '}
                      모드: 총 {topicPagination.total}개의 주제 중 {topicRanking.length}개 표시
                    </span>
                    {topicPagination.hasNext && (
                      <span className="text-blue-500 sm:ml-2">(더 보기 버튼으로 추가 로드)</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 통계 정보 */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">총 제출</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalSubmissions}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    평균 점수
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(stats.averageScore || 0).toFixed(1)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    피드백 수
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalFeedbacks}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    오늘 제출
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.submissionsToday}
                  </p>
                </div>
              </div>
            )}

            {/* 유저 프로필 정보 */}
            {stats?.userProfile && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    👤 {stats.userProfile.displayName}의 프로필
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.userProfile.email}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 300자 모드 통계 카드 */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        300
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        300자 모드
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">평균 점수</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {(stats.userProfile?.writingStats?.mode_300?.averageScore || 0).toFixed(
                            1
                          )}
                          점
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">트렌드</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            stats.userProfile.writingStats.mode_300.scoreTrend === 'improving'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : stats.userProfile.writingStats.mode_300.scoreTrend === 'declining'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {stats.userProfile.writingStats.mode_300.scoreTrend === 'improving'
                            ? '📈 상승'
                            : stats.userProfile.writingStats.mode_300.scoreTrend === 'declining'
                              ? '📉 하락'
                              : '➡️ 안정'}
                        </span>
                      </div>

                      {stats.userProfile.writingStats.mode_300.strengthAreas.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            강점 영역
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stats.userProfile.writingStats.mode_300.strengthAreas.map(
                              (area, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full"
                                >
                                  {area}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1000자 모드 통계 카드 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        1K
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        1000자 모드
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">평균 점수</span>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(stats.userProfile?.writingStats?.mode_1000?.averageScore || 0).toFixed(
                            1
                          )}
                          점
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">트렌드</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            stats.userProfile.writingStats.mode_1000.scoreTrend === 'improving'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : stats.userProfile.writingStats.mode_1000.scoreTrend === 'declining'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {stats.userProfile.writingStats.mode_1000.scoreTrend === 'improving'
                            ? '📈 상승'
                            : stats.userProfile.writingStats.mode_1000.scoreTrend === 'declining'
                              ? '📉 하락'
                              : '➡️ 안정'}
                        </span>
                      </div>

                      {stats.userProfile.writingStats.mode_1000.strengthAreas.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            강점 영역
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stats.userProfile.writingStats.mode_1000.strengthAreas.map(
                              (area, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                                >
                                  {area}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 개선 영역 및 선호 주제 */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        📊
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        분석 정보
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {stats.userProfile.writingStats.mode_300.weaknessAreas.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            개선 영역
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stats.userProfile.writingStats.mode_300.weaknessAreas
                              .slice(0, 3)
                              .map((area, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs rounded-full"
                                >
                                  {area}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {stats.userProfile.writingStats.mode_300.preferredTopics.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            선호 주제
                          </span>
                          <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                            {stats.userProfile.writingStats.mode_300.preferredTopics
                              .slice(0, 2)
                              .map((topic, index) => (
                                <div key={index} className="truncate mb-1" title={topic}>
                                  • {topic}
                                </div>
                              ))}
                            {stats.userProfile.writingStats.mode_300.preferredTopics.length > 2 && (
                              <div className="text-purple-600 dark:text-purple-400">
                                +
                                {stats.userProfile.writingStats.mode_300.preferredTopics.length - 2}
                                개 더
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 사용자 선택 섹션 */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                사용자 선택
              </h3>

              {/* 검색 기능 */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="이메일 또는 사용자명으로 검색..."
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                    value={userSearchTerm}
                    onChange={e => {
                      const searchTerm = e.target.value;
                      setUserSearchTerm(searchTerm);

                      // 검색어가 변경되면 서버에서 검색
                      if (searchTerm.length >= 2 || searchTerm.length === 0) {
                        fetchUsers(1, searchTerm);
                      }
                    }}
                  />
                  <button
                    onClick={() => fetchUsers(1, userSearchTerm)}
                    className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* 전체 통계 카드 */}
              <div className="mb-4">
                <div
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedUser === ''
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  onClick={() => handleUserChange('')}
                >
                  <div className="font-medium text-gray-900 dark:text-white">📊 전체 통계</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">모든 사용자</div>
                </div>
              </div>

              {/* 가상화된 사용자 목록 */}
              <VirtualizedUserList
                users={filteredUsers}
                selectedUser={selectedUser}
                onUserSelect={handleUserChange}
                searchTerm={userSearchTerm}
                onLoadMore={() => fetchUsers(userPagination.page + 1, userSearchTerm)}
                hasMore={userPagination.hasNext}
                loading={userLoading}
              />

              {/* 사용자 통계 정보 */}
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                총 {userPagination.total}명의 사용자 중 {filteredUsers.length}명 표시
                {userPagination.hasNext && (
                  <span className="ml-2 text-blue-500">(스크롤하여 더 보기)</span>
                )}
              </div>
            </div>

            {/* 제출물 목록 수정 */}
            {loading ? (
              <DashboardSkeleton />
            ) : displayedSubmissions.length > 0 ? (
              <div className="space-y-4 sm:space-y-8">
                {displayedSubmissions.map(submission => (
                  <div
                    key={submission._id}
                    className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-3 sm:p-6"
                  >
                    {/* 제출물 헤더 */}
                    <div className="mb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
                        <div className="w-full sm:w-auto">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-semibold">{submission.title}</h2>
                            {submission.topic && (
                              <span className="text-xs text-gray-500 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {submission.topic}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            작성자: {submission.user.displayName}
                          </p>
                          <p className="text-sm text-gray-400 hidden sm:block">
                            ({submission.user.email})
                          </p>
                          <p className="text-sm text-gray-400">
                            작성 시간:{' '}
                            {formatDateTime(
                              submission.createdAt,
                              submission.userTimezone,
                              submission.userTimezoneOffset
                            )}
                            {submission.userTimezone && (
                              <span className="ml-2 text-gray-500">
                                {formatLocation(submission.userTimezone)}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-400">
                            글자수: {submission.text.length}자 | 작성 시간:{' '}
                            {formatDuration(submission.duration)} | 세션 수:{' '}
                            {submission.sessionCount}회
                          </p>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                              submission.mode === 'mode_300'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                            }`}
                          >
                            {submission.mode === 'mode_300' ? '300자' : '1000자'}
                          </span>
                          <div className="text-right">
                            <p className="font-semibold text-base sm:text-lg text-gray-300">
                              {submission.score !== undefined ? `${submission.score}점` : '미평가'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 글 내용 */}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-300">
                        내용
                      </h3>
                      <p className="whitespace-pre-wrap bg-gray-50 p-2 sm:p-4 rounded text-sm sm:text-base dark:bg-gray-700 text-black dark:text-white">
                        {submission.text}
                      </p>
                    </div>

                    {/* 피드백 섹션 */}
                    <div className="mt-4 sm:mt-6 border-t pt-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4 text-gray-300">
                        받은 피드백 ({submission.feedbackCount || 0})
                      </h3>
                      <div className="space-y-3">
                        {submission.feedbacks?.map(feedback => (
                          <div
                            key={feedback._id}
                            className="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2 mb-2">
                              <div>
                                <p className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-600">
                                  {feedback.fromUser.displayName}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-400">
                                  {feedback.fromUser.email}
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {formatDateTime(
                                  feedback.createdAt,
                                  feedback.fromUserTimezone || submission.userTimezone,
                                  feedback.fromUserOffset ?? submission.userTimezoneOffset
                                )}
                              </p>
                            </div>
                            <p className="mt-2 text-sm sm:text-base text-gray-700 whitespace-pre-wrap">
                              {feedback.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 더보기 버튼 */}
                {submissionsPagination.hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      더보기 (페이지 {submissionsPagination.currentPage}/
                      {submissionsPagination.totalPages})
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* 데이터 없음 상태 */}
            {!loading && displayedSubmissions.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
                  <div className="text-gray-400 mb-3">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {selectedUser ? '작성된 글이 없습니다' : '데이터가 없습니다'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {selectedUser
                      ? '선택한 사용자가 아직 글을 작성하지 않았습니다.'
                      : '선택한 기간에 작성된 글이 없습니다.'}
                  </p>
                  {selectedUser && (
                    <button
                      onClick={() => handleUserChange('')}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      전체 사용자 보기
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ScrollToTop />
    </Layout>
  );
};

export default Dashboard;
