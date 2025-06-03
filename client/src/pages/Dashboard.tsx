// 관리자 대시보드 컴포넌트 (React + Tailwind + TypeScript)

import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { isAdmin } from '../utils/admin';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ScrollToTop from '../components/ScrollToTop';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface User {
  uid: string;
  displayName: string;
  email: string;
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
}

interface Submission {
  _id: string;
  title: string;
  topic: string;
  text: string;
  mode: 'mode_300' | 'mode_1000';
  user: {
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
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ uid: string; displayName: string; email: string }>>(
    []
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [likeReceivedRanking, setLikeReceivedRanking] = useState<
    { user: { displayName: string; uid: string }; likeCount: number }[]
  >([]);
  const [topicRanking, setTopicRanking] = useState<
    {
      topic: string;
      mode: 'mode_300' | 'mode_1000';
      count: number;
      averageScore: number;
      firstDate?: string;
    }[]
  >([]);
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
  const [displayCount, setDisplayCount] = useState(20); // 표시할 글 개수 상태 추가
  const ITEMS_PER_PAGE = 20; // 한 번에 표시할 글 개수

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const start = startDate || new Date(1970, 0, 1);
        const end = endDate || new Date();

        const [chartRes, topicRes] = await Promise.all([
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/dashboard/weekly?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
          ),
          axios.get(
            `${import.meta.env.VITE_API_URL}/api/dashboard/rankings/topics?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
          ),
        ]);

        setSubmissions(chartRes.data);
        setTopicRanking(topicRes.data.topicRanking);

        if (start.getTime() === end.getTime()) {
          const filtered = topicRes.data.topicRanking.filter(
            (t: any) => t.mode === 'mode_300' || t.mode === 'mode_1000'
          );

          const mostFrequent = filtered.sort((a: any, b: any) => b.count - a.count)[0];
          setSelectedTopic(mostFrequent?.topic || '주제 없음');
        } else {
          setSelectedTopic(null);
        }
      } catch (error) {
        console.error('주제 랭킹 불러오기 실패:', error);
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

  // 모든 데이터 가져오기
  const fetchAllData = async (start?: Date | null, end?: Date | null, userId?: string) => {
    if (!user && !userId) return; // 로그인하지 않은 상태에서 userId도 없는 경우

    setLoading(true);
    try {
      const params: any = {};
      if (start) params.start = format(start, 'yyyy-MM-dd');
      if (end) params.end = format(end, 'yyyy-MM-dd');

      // API 호출 시 선택된 사용자의 UID 사용
      const targetUid = userId || user?.uid;

      const [submissionsRes, statsRes, rankingsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/all-submissions/${targetUid}`, {
          params,
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats/${targetUid}`, { params }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings`, { params }),
      ]);

      setSubmissions(submissionsRes.data);
      setStats(statsRes.data);
      setRankings(rankingsRes.data);
    } catch (e) {
      console.error(e);
      setError('데이터 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchAllData();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTopicRanking();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchLikesReceived = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/rankings/likes-received`
        );
        setLikeReceivedRanking(res.data.likeReceivedRanking);
      } catch (err) {
        console.error('좋아요 받은 랭킹 가져오기 실패:', err);
      }
    };

    fetchLikesReceived();
  }, []);

  // 사용자 선택 시
  const handleUserChange = (uid: string) => {
    setSelectedUser(uid);
    // 선택된 사용자의 데이터만 가져오도록 fetchAllData 호출
    if (uid) {
      // 특정 사용자 선택 시
      fetchAllData(startDate, endDate, uid);
    } else {
      // "모든 사용자" 선택 시
      fetchAllData(startDate, endDate);
    }
  };

  // 날짜/시간 포맷팅 함수
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'PPP a h시 mm분', { locale: ko });
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
    fetchAllData();
  };

  const fetchTopicRanking = async () => {
    try {
      const params: any = {};
      if (startDate) params.start = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end = format(endDate, 'yyyy-MM-dd');

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings/topics`, {
        params,
      });

      if (res.data && res.data.topicRanking) {
        setTopicRanking(res.data.topicRanking);
      } else {
        setTopicRanking([]);
      }
    } catch (e) {
      console.error('주제 랭킹 불러오기 실패:', e);
      setTopicRanking([]);
    }
  };

  // 더보기 버튼 클릭 핸들러 추가
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  // 필터링된 제출물을 계산하는 부분 수정
  const filteredSubmissions = selectedUser
    ? submissions.filter(sub => sub.user.uid === selectedUser)
    : submissions;

  // 표시할 제출물만 선택
  const displayedSubmissions = filteredSubmissions.slice(0, displayCount);

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
    fetchAllData(start, now);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(first);
    setEndDate(now);
    fetchAllData(first, now);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    fetchAllData(null, null);
  };

  // 사용자 목록을 가져오는 함수 추가
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('사용자 목록을 불러오는데 실패했습니다:', error);
    }
  };

  // 작성된 날짜를 가져오는 함수 수정
  const fetchSubmissionDates = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/submission-dates`
      );

      const dates = response.data.dates.map((dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      });

      setSubmissionDates(dates);
    } catch (error) {
      console.error('작성 날짜 목록을 불러오는데 실패했습니다:', error);
    }
  };

  // useEffect 수정
  useEffect(() => {
    fetchUsers();
    fetchAllData();
    fetchSubmissionDates();
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

        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <DatePicker
                selected={startDate}
                onChange={date => {
                  if (date) {
                    setStartDate(date);
                    setEndDate(date);
                    fetchAllData(date, date);
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
                  return isHighlighted ? 'highlighted' : undefined;
                }}
              />
              <button onClick={fetchAllData} className="btn-filter">
                조회
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleThisWeek} className="btn-filter">
                이번 주
              </button>
              <button onClick={handleThisMonth} className="btn-filter">
                이번 달
              </button>
              <button onClick={handleClear} className="btn-filter">
                전체 보기
              </button>
            </div>
          </div>

          {selectedTopic && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <p>
                📅 <strong>{format(startDate, 'yyyy년 MM월 dd일')}</strong>의 대표 주제는
                <span className="mx-1 font-semibold">{selectedTopic}</span>입니다.
              </p>
            </div>
          )}
        </div>

        {isAdminView ? (
          // 관리자 뷰
          <div className="space-y-4 sm:space-y-6">
            {adminSubmissions.map(submission => (
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
                      <p className="text-sm text-gray-400">작성자: {submission.user.displayName}</p>
                      <p className="text-sm text-gray-400 hidden sm:block">
                        ({submission.user.email})
                      </p>
                      <p className="text-sm text-gray-400">
                        작성 시간: {formatDateTime(submission.createdAt)}
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
                            {new Date(feedback.createdAt).toLocaleString()}
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
        ) : (
          <>
            <RankingSection rankings={rankings} likeReceivedRanking={likeReceivedRanking} />

            {topicRanking.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
                <h3 className="text-lg font-bold mb-4">🔥 주제별 랭킹</h3>

                {['mode_300', 'mode_1000'].map(mode => (
                  <div key={mode} className="mb-4">
                    <h4 className="text-md font-semibold mb-2">
                      {mode === 'mode_300' ? '🟢 300자 모드' : '🔵 1000자 모드'}
                    </h4>
                    <div className="space-y-1">
                      {topicRanking
                        .filter(item => item.mode === mode)
                        .sort((a, b) => b.count - a.count)
                        .map((item, index) => (
                          <div
                            key={`${mode}-${item.topic}`}
                            className="flex flex-col text-sm border-b pb-2"
                          >
                            <div className="flex justify-between">
                              <div>
                                <span className="font-semibold">{index + 1}위</span>. {item.topic}
                              </div>
                              <div className="text-gray-500">
                                {item.count}회 / 평균 {item.averageScore.toFixed(1)}점
                              </div>
                            </div>
                            <div className="text-gray-400 mt-1 text-xs">
                              🗓️ {Array.from(new Set(item.dates)).join(', ')}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 사용자 선택 드롭다운 반응형 수정 */}
            <div className="mb-4 sm:mb-6">
              <select
                className="w-full p-2 dark:border-gray-700 rounded text-sm sm:text-base dark:bg-gray-800 text-black dark:text-gray-300"
                value={selectedUser}
                onChange={e => handleUserChange(e.target.value)}
              >
                <option value="">모든 사용자</option>
                {users && users.length > 0 ? (
                  users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName || '익명'} ({user.email})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    사용자 목록을 불러오는 중...
                  </option>
                )}
              </select>
            </div>

            {/* 제출물 목록 수정 */}
            {!loading && displayedSubmissions.length > 0 && (
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
                            작성 시간: {formatDateTime(submission.createdAt)}
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
                                <p className="font-medium text-sm sm:text-base">
                                  {feedback.fromUser.displayName}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-400">
                                  {feedback.fromUser.email}
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {new Date(feedback.createdAt).toLocaleString()}
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
                {filteredSubmissions.length > displayCount && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      더보기 ({displayCount}/{filteredSubmissions.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 로딩 상태 */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* 데이터 없음 상태 */}
            {!loading && displayedSubmissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">작성된 글이 없습니다.</div>
            )}
          </>
        )}
      </div>
      <ScrollToTop />
    </Layout>
  );
};

export default Dashboard;
