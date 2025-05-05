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
      <div className="bg-white rounded-lg shadow p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 점수 랭킹 */}
          <div className="p-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
              <h3 className="text-lg font-semibold mb-2 sm:mb-0">평균 점수 랭킹</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded ${
                    activeTab === '300' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                  }`}
                  onClick={() => setActiveTab('300')}
                >
                  300자
                </button>
                <button
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm rounded ${
                    activeTab === '1000' ? 'bg-blue-500 text-white' : 'bg-gray-100'
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
                  <div className="text-right">
                    <span className="font-semibold">{rank.score}점</span>
                    <span className="text-xs text-gray-500 ml-1">({rank.submissionCount}회)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 받은 피드백 랭킹 */}
          <div>
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
                  <span className="font-semibold">{rank.feedbackCount}개</span>
                </div>
              ))}
            </div>
          </div>

          {/* 작성한 피드백 랭킹 */}
          <div>
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
          <div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAdmin(user.uid)) {
      navigate('/'); // 비관리자는 홈으로 리디렉션
    }
  }, [user, navigate]);
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [likeReceivedRanking, setLikeReceivedRanking] = useState<
    { user: { displayName: string; uid: string }; likeCount: number }[]
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

  // 모든 데이터 가져오기
  const fetchAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [submissionsRes, statsRes, rankingsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/all-submissions/${user.uid}`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats/${user.uid}`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/rankings/likes-received`),
      ]);

      // console.log('서버 응답 데이터:', submissionsRes.data);

      // 사용자 목록 추출
      const uniqueUsers = Array.from(new Set(submissionsRes.data.map(sub => sub.user.uid))).map(
        uid => {
          const submission = submissionsRes.data.find(sub => sub.user.uid === uid);
          return {
            uid: submission.user.uid,
            displayName: submission.user.displayName,
            email: submission.user.email,
          };
        }
      );

      setUsers(uniqueUsers);

      // 선택된 사용자의 제출물만 필터링
      const filteredSubmissions = selectedUser
        ? submissionsRes.data.filter(sub => sub.user.uid === selectedUser)
        : submissionsRes.data;

      // console.log('필터링된 제출물:', filteredSubmissions); // 필터링된 데이터 확인용 로그

      setSubmissions(filteredSubmissions);
      setStats(statsRes.data);
      setRankings(rankingsRes.data);
    } catch (error) {
      // console.error('Failed to fetch data:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchAllData();
  }, [user]);

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

  // 필터링된 제출물을 계산하는 부분 추가
  const filteredSubmissions = selectedUser
    ? submissions.filter(sub => sub.user.uid === selectedUser)
    : submissions;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0">
            {isAdminView ? '관리자 대시보드' : '작성 현황'}
          </h1>
        </div>

        {isAdminView ? (
          // 관리자 뷰
          <div className="space-y-8">
            {adminSubmissions.map(submission => (
              <div key={submission._id} className="bg-white rounded-lg shadow p-6 mb-6">
                {/* 제출물 헤더 */}
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-xl font-semibold">{submission.title}</h2>
                      <p className="text-gray-600">
                        작성자: {submission.user.displayName} ({submission.user.email})
                      </p>
                      <p className="text-gray-600">
                        작성 시간: {formatDateTime(submission.createdAt)}
                      </p>
                      <p className="text-gray-600">
                        소요 시간: {formatDuration(submission.duration)}
                      </p>
                      <p className="text-gray-600">주제: {submission.topic}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          submission.mode === 'mode_300'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {submission.mode === 'mode_300' ? '300자' : '1000자'}
                      </span>
                      <div className="mt-2">
                        <p className="font-semibold text-lg">{submission.score}점</p>
                        <p className="text-sm text-gray-600">
                          세션 수: {submission.sessionCount}회
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 글 내용 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">내용</h3>
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{submission.text}</p>
                </div>

                {/* 피드백 섹션 */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">
                    받은 피드백 ({submission.feedbackCount || 0})
                  </h3>
                  {submission.feedbacks && submission.feedbacks.length > 0 ? (
                    <div className="space-y-4">
                      {submission.feedbacks.map((feedback, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{feedback.fromUser.displayName}</p>
                              <p className="text-sm text-gray-600">{feedback.fromUser.email}</p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(feedback.createdAt)}
                            </p>
                          </div>
                          <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                            {feedback.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">아직 받은 피드백이 없습니다.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <RankingSection rankings={rankings} likeReceivedRanking={likeReceivedRanking} />

            {/* 사용자 선택 드롭다운 반응형 수정 */}
            <div className="mb-4 sm:mb-6">
              <select
                className="w-full p-2 border rounded text-sm sm:text-base"
                value={selectedUser}
                onChange={e => handleUserChange(e.target.value)}
              >
                <option value="">모든 사용자</option>
                {users.map(user => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* 제출물 목록 반응형 수정 */}
            {!loading && filteredSubmissions.length > 0 && (
              <div className="space-y-4 sm:space-y-8">
                {filteredSubmissions.map(submission => (
                  <div key={submission._id} className="bg-white rounded-lg shadow p-3 sm:p-6">
                    {/* 제출물 헤더 */}
                    <div className="mb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
                        <div className="w-full sm:w-auto">
                          <h2 className="text-lg sm:text-xl font-semibold">{submission.title}</h2>
                          <p className="text-sm text-gray-600">
                            작성자: {submission.user.displayName}
                          </p>
                          <p className="text-sm text-gray-600 hidden sm:block">
                            ({submission.user.email})
                          </p>
                          <p className="text-sm text-gray-600">
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
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-semibold mb-2">내용</h3>
                      <p className="whitespace-pre-wrap bg-gray-50 p-2 sm:p-4 rounded text-sm sm:text-base">
                        {submission.text}
                      </p>
                    </div>

                    {/* 피드백 섹션 */}
                    <div className="mt-4 sm:mt-6 border-t pt-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
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
                                <p className="text-xs sm:text-sm text-gray-600">
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
            )}

            {/* 로딩 상태 */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* 데이터 없음 상태 */}
            {!loading && filteredSubmissions.length === 0 && (
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
