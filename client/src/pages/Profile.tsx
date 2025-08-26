import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import ScrollToTop from '../components/ScrollToTop';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  feedbackNotification: boolean;
  createdAt: string;
  updatedAt: string;
}

const Profile: React.FC = () => {
  const { user, refreshUser, getIdToken } = useUser();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    feedbackNotification: true,
  });
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [nicknameErrors, setNicknameErrors] = useState<string[]>([]);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [isDuplicateNickname, setIsDuplicateNickname] = useState(false);

  // 프로필 정보 로드
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = await getIdToken();
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/user/profile?uid=${user.uid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const profileData = response.data;
        setProfile(profileData);
        setFormData({
          displayName: profileData.displayName || '',
          feedbackNotification: profileData.feedbackNotification,
        });
      } catch (error) {
        console.error('프로필 로드 실패:', error);
        toast.error('프로필 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    // 구글 로그인 사용자 확인
    const checkGoogleUser = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const providers = currentUser.providerData;
          const isGoogle = providers.some(provider => provider.providerId === 'google.com');
          setIsGoogleUser(isGoogle);
        }
      } catch (error) {
        console.error('구글 사용자 확인 실패:', error);
      }
    };

    fetchProfile();
    checkGoogleUser();
  }, [user]);

  // 닉네임 유효성 검사
  const validateNickname = (nickname: string): string[] => {
    const errors: string[] = [];

    if (!nickname || nickname.trim().length === 0) {
      errors.push('닉네임을 입력해주세요.');
      return errors;
    }

    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 2) {
      errors.push('닉네임은 2글자 이상이어야 합니다.');
    }

    if (trimmedNickname.length > 20) {
      errors.push('닉네임은 20글자 이하여야 합니다.');
    }

    // 부적절한 닉네임 패턴 체크
    const inappropriatePatterns = [
      /^익명$/,
      /^anonymous$/i,
      /^anon$/i,
      /^unknown$/i,
      /^guest$/i,
      /^user$/i,
      /^사용자$/,
      /^닉네임$/,
      /^nickname$/i,
      /^\d+$/,
      /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,
      /^\s+$/,
      /^admin$/i,
      /^administrator$/i,
      /^관리자$/,
      /^운영자$/,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(trimmedNickname)) {
        errors.push('부적절한 닉네임입니다. 다른 닉네임을 사용해주세요.');
        break;
      }
    }

    return errors;
  };

  // 중복 닉네임 체크
  const checkDuplicateNickname = async (nickname: string) => {
    if (!nickname || nickname.trim().length === 0) return;

    try {
      setIsCheckingNickname(true);
      const token = await getIdToken();

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/check-nickname?nickname=${encodeURIComponent(nickname)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsDuplicateNickname(response.data.isDuplicate);

      if (response.data.isDuplicate) {
        setNicknameErrors(prev => [
          ...prev.filter(e => !e.includes('중복')),
          '이미 사용 중인 닉네임입니다.',
        ]);
      }
    } catch (error) {
      console.error('중복 닉네임 체크 실패:', error);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  // 폼 데이터 변경 핸들러
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // 닉네임 변경 시 실시간 검증
    if (field === 'displayName') {
      const errors = validateNickname(value as string);
      setNicknameErrors(errors);

      // 에러가 없고 닉네임이 변경된 경우에만 중복 체크
      if (errors.length === 0 && value !== profile?.displayName) {
        checkDuplicateNickname(value as string);
      } else {
        setIsDuplicateNickname(false);
      }
    }
  };

  // 프로필 업데이트
  const handleSave = async () => {
    if (!user) return;

    // 닉네임 유효성 검사
    if (formData.displayName !== profile?.displayName) {
      const errors = validateNickname(formData.displayName);
      if (errors.length > 0) {
        setNicknameErrors(errors);
        toast.error('닉네임이 유효하지 않습니다.');
        return;
      }
    }

    try {
      setSaving(true);

      // 1. 서버 데이터베이스 업데이트
      const token = await getIdToken();
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/user/profile`,
        { uid: user.uid, ...formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Firebase Auth의 displayName도 업데이트
      if (formData.displayName !== user.displayName) {
        try {
          const { getAuth, updateProfile } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;

          if (currentUser) {
            console.log('Firebase Auth 업데이트 전:', currentUser.displayName);
            await updateProfile(currentUser, {
              displayName: formData.displayName,
            });
            console.log('Firebase Auth displayName 업데이트 성공:', formData.displayName);

            // 업데이트 후 다시 확인
            const updatedUser = auth.currentUser;
            console.log('Firebase Auth 업데이트 후:', updatedUser?.displayName);
          }
        } catch (firebaseError) {
          console.error('Firebase Auth displayName 업데이트 실패:', firebaseError);
          // Firebase 업데이트 실패해도 서버 업데이트는 성공했으므로 계속 진행
        }
      }

      setProfile(response.data.user);

      toast.success('프로필이 업데이트되었습니다! 기존 글들의 닉네임도 함께 업데이트되었습니다.');

      // 1초 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('프로필 업데이트 실패:', error);

      // 서버에서 반환한 에러 메시지 처리
      if (error.response?.data?.message) {
        if (error.response.data.errors) {
          setNicknameErrors(error.response.data.errors);
          toast.error('닉네임이 유효하지 않습니다.');
        } else {
          toast.error(error.response.data.message);
        }
      } else {
        toast.error('프로필 업데이트에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  // 비밀번호 재설정 이메일 전송
  const handlePasswordReset = async () => {
    if (!user) return;

    try {
      setPasswordResetLoading(true);

      // Firebase Auth를 통한 비밀번호 재설정 이메일 전송
      const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
      const auth = getAuth();

      await sendPasswordResetEmail(auth, user.email!);

      toast.success('비밀번호 재설정 이메일이 전송되었습니다. 이메일을 확인해주세요.');
    } catch (error: any) {
      console.error('비밀번호 재설정 이메일 전송 실패:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('사용자를 찾을 수 없습니다.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('비밀번호 재설정 이메일 전송에 실패했습니다.');
      }
    } finally {
      setPasswordResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            프로필을 확인하려면 먼저 로그인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">프로필 설정</h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            나만의 글쓰기 환경을 맞춤 설정하세요
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 설정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                기본 정보
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    이메일은 변경할 수 없습니다
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    닉네임
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={e => handleInputChange('displayName', e.target.value)}
                    placeholder="닉네임을 입력하세요"
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      nicknameErrors.length > 0
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {/* 닉네임 에러 메시지 */}
                  {nicknameErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {nicknameErrors.map((error, index) => (
                        <p
                          key={index}
                          className="text-sm text-red-600 dark:text-red-400 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                  {/* 닉네임 가이드라인 */}
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>• 2-20자 사이로 입력해주세요</p>
                    <p>• 익명, anonymous, user 등은 사용할 수 없습니다</p>
                    <p>• 중복된 닉네임은 사용할 수 없습니다</p>
                    {isCheckingNickname && <p className="text-blue-500">• 중복 확인 중...</p>}
                    {!isCheckingNickname &&
                      formData.displayName !== profile?.displayName &&
                      formData.displayName.trim().length > 0 &&
                      nicknameErrors.length === 0 &&
                      !isDuplicateNickname && (
                        <p className="text-green-500">• 사용 가능한 닉네임입니다</p>
                      )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    가입일
                  </label>
                  <input
                    type="text"
                    value={
                      profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('ko-KR')
                        : ''
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* 비밀번호 재설정 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                비밀번호 재설정
              </h2>

              <div className="space-y-4">
                {isGoogleUser ? (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          구글 계정
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Google로 로그인한 계정입니다
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      구글 계정의 비밀번호는 Google 계정 설정에서 변경하실 수 있습니다.
                    </p>
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors inline-block text-center"
                    >
                      Google 계정 보안 설정
                    </a>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      비밀번호를 잊어버리셨나요? 이메일로 비밀번호 재설정 링크를 전송해드립니다.
                    </p>
                    <button
                      onClick={handlePasswordReset}
                      disabled={passwordResetLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordResetLoading ? '전송 중...' : '비밀번호 재설정 이메일 전송'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 알림 설정 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                알림 설정
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      피드백 알림
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      다른 사용자의 피드백을 받았을 때 알림을 받습니다
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.feedbackNotification}
                      onChange={e => handleInputChange('feedbackNotification', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  nicknameErrors.length > 0 ||
                  formData.displayName.trim().length === 0 ||
                  isDuplicateNickname
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 테마 설정 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                테마 설정
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">다크 모드</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      어두운 테마로 전환합니다
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDarkMode}
                      onChange={toggleTheme}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 계정 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                계정 정보
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">사용자 ID:</span>
                  <span className="text-gray-900 dark:text-white font-mono text-xs">
                    {user.uid.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">마지막 업데이트:</span>
                  <span className="text-gray-900 dark:text-white">
                    {profile?.updatedAt
                      ? new Date(profile.updatedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
};

export default Profile;
