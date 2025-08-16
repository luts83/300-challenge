import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { ADMIN_UIDS, isAdmin } from '../utils/admin';

// 사용자 상태 타입 정의
interface UserState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  isAdmin: boolean;
}

// Context 타입 정의
interface UserContextType extends UserState {
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

// 초기 상태
const initialState: UserState = {
  user: null,
  loading: true,
  initialized: false,
  isAdmin: false,
};

// Context 생성
const UserContext = createContext<UserContextType>({
  ...initialState,
  setUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

// Custom hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [state, setState] = useState<UserState>(initialState);

  // 사용자 정보 업데이트 함수
  const setUser = useCallback((user: User | null) => {
    const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;
    setState(prev => ({
      ...prev,
      user,
      loading: false,
      isAdmin,
    }));
  }, []);

  // 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await auth.signOut();
      setState({ user: null, loading: false, initialized: true });
      toast.success('로그아웃되었습니다');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      toast.error('로그아웃에 실패했습니다');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  // ID 토큰 가져오기 함수
  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!state.user) return null;
      return await state.user.getIdToken();
    } catch (error) {
      console.error('ID 토큰 가져오기 실패:', error);
      return null;
    }
  }, [state.user]);

  // 사용자 정보 새로고침 함수 (간소화)
  const refreshUser = useCallback(async () => {
    try {
      if (!state.user) return;

      // 네트워크 상태 확인
      if (!navigator.onLine) {
        return;
      }

      setState(prev => ({ ...prev, loading: true }));

      // 간단한 검증만 수행 (무한 루프 방지)
      const currentUser = auth.currentUser;
      if (currentUser) {
        setState(prev => ({
          ...prev,
          user: currentUser,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          loading: false,
        }));
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Firebase Auth 상태 변경 감지
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setUser(user);
      setState(prev => ({ ...prev, initialized: true }));
    });

    const unsubscribeToken = onIdTokenChanged(auth, user => {
      if (!user) {
        setState(prev => ({ ...prev, loading: false, initialized: true }));
      }
      // 토큰 변경 시 사용자 정보 검증 비활성화 (무한 루프 방지)
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, [setUser]);

  // 사용자 표시 이름 처리
  const enhancedUser = useMemo(() => {
    if (!state.user) return null;
    return {
      ...state.user,
      displayName: state.user.displayName || state.user.email?.split('@')[0] || '사용자',
    };
  }, [state.user]);

  // Context 값
  const contextValue = useMemo(
    () => ({
      ...state,
      setUser,
      logout,
      refreshUser,
      getIdToken,
    }),
    [state, setUser, logout, refreshUser, getIdToken]
  );

  // 초기화되지 않은 경우 로딩 표시
  if (!state.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};
