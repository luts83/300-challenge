import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // ✅ fallback displayName 생성
  const enhancedUser = user
    ? {
        ...user,
        displayName: user.displayName || user.email?.split("@")[0] || "사용자",
      }
    : null;

  return (
    <UserContext.Provider value={{ user: enhancedUser, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

