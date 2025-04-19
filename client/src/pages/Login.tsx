// src/pages/Login.tsx
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

// Firebase 에러 코드에 따른 사용자 친화적 메시지 매핑
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return '유효하지 않은 이메일 형식입니다.';
    case 'auth/user-not-found':
      return '등록되지 않은 이메일입니다.';
    case 'auth/wrong-password':
      return '비밀번호가 잘못되었습니다.';
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/too-many-requests':
      return '너무 많은 시도입니다. 잠시 후 다시 시도해주세요.';
    default:
      return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
  }
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useUser();
  const navigate = useNavigate();

  const validateInputs = (): boolean => {
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleAuth = async () => {
    setError('');
    if (!validateInputs()) return;

    try {
      const userCred = isNewUser
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      setUser(userCred.user);
      alert(`${isNewUser ? '회원가입' : '로그인'} 성공! 🎉`);
      navigate('/');
    } catch (err: any) {
      console.error('인증 오류:', err.code, err.message);
      setError(getErrorMessage(err.code));
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      setUser(userCred.user);
      alert('Google 로그인 성공! 🎉');
      navigate('/');
    } catch (err: any) {
      console.error('Google 인증 오류:', err.code, err.message);
      setError(getErrorMessage(err.code) || 'Google 로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h2 className="text-2xl font-bold mb-4">{isNewUser ? '회원가입' : '로그인'}</h2>
      <div className="w-full max-w-xs">
        <input
          type="email"
          placeholder="이메일"
          className="mb-2 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="mb-2 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="text-red-500 mb-2 text-sm text-center">{error}</p>
        )}
        <button
          onClick={handleAuth}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full mb-2"
        >
          {isNewUser ? '회원가입' : '로그인'}
        </button>
        <button
          onClick={handleGoogleLogin}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full mb-4"
        >
          Google로 로그인
        </button>
        <p
          className="text-sm text-gray-600 cursor-pointer text-center hover:underline"
          onClick={() => {
            setIsNewUser(!isNewUser);
            setError('');
            setEmail('');
            setPassword('');
          }}
        >
          {isNewUser ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </p>
      </div>
    </div>
  );
};

export default Login;