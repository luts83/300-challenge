import React, { useState, FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

// Firebase 에러 코드에 따른 사용자 친화적 메시지
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
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  // 실시간 유효성 검사
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateInputs = (): boolean => {
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return false;
    }

    if (!validateEmail(email)) {
      setError('유효한 이메일 주소를 입력해주세요.');
      return false;
    }

    if (!validatePassword(password)) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return false;
    }

    if (isNewUser && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // 폼 기본 동작 방지
    setError('');

    if (!validateInputs()) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    <div className="wrapper-login">
      <h2 className="text-2xl font-bold mb-4">{isNewUser ? '회원가입' : '로그인'}</h2>
      <form onSubmit={handleSubmit} className="login-box">
        <div>
          <input
            type="email"
            placeholder="이메일"
            className={`form-input ${!validateEmail(email) && email ? 'border-red-500' : ''}`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="비밀번호"
            className={`form-input ${!validatePassword(password) && password ? 'border-red-500' : ''}`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isLoading}
          />
          {isNewUser && (
            <input
              type="password"
              placeholder="비밀번호 확인"
              className={`form-input ${password !== passwordConfirm && passwordConfirm ? 'border-red-500' : ''}`}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              disabled={isLoading}
            />
          )}
        </div>

        {error && <p className="text-red-500 text-sm mt-2 mb-2">{error}</p>}

        <button type="submit" className="btn-auth w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              처리중...
            </span>
          ) : isNewUser ? (
            '회원가입'
          ) : (
            '로그인'
          )}
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn-google w-full"
          disabled={isLoading}
        >
          Google로 로그인
        </button>

        <p
          className="btn-toggle-link mt-4 text-center"
          onClick={() => {
            if (!isLoading) {
              setIsNewUser(!isNewUser);
              setError('');
              setEmail('');
              setPassword('');
              setPasswordConfirm('');
            }
          }}
        >
          {isNewUser ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </p>
      </form>
    </div>
  );
};

export default Login;
