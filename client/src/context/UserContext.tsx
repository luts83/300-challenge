import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
    });

    auth.onIdTokenChanged(user => {
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  };

  const enhancedUser = user
    ? {
        ...user,
        displayName: user.displayName || user.email?.split('@')[0] || '사용자',
      }
    : null;

  return (
    <UserContext.Provider value={{ user: enhancedUser, loading, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};
