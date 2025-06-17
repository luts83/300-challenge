import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface UserPostSectionProps {
  show: boolean;
}

interface Submission {
  _id: string;
  title: string;
  text: string;
  user: {
    displayName: string;
    email: string;
  };
  mode: 'mode_300' | 'mode_1000';
  likeCount: number;
  createdAt: string;
}

const AUTO_SLIDE_DURATION = 180000; // 3분

const UserPostSection: React.FC<UserPostSectionProps> = ({ show }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px 0px',
  });

  const [currentPost, setCurrentPost] = useState<Submission | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [posts, setPosts] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // MongoDB에서 최근 글 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/submit/recent`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();

        if (responseData.success && Array.isArray(responseData.data)) {
          const posts = responseData.data;
          setPosts(posts);
          if (posts.length > 0) {
            setCurrentPost(posts[0]);
          }
        }
      } catch (error) {
        // 에러 핸들링
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 15초마다 새로운 글 표시 (중복 interval 방지)
  useEffect(() => {
    if (inView && posts.length > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setIsChanging(true);
        setTimeout(() => {
          const randomPost = posts[Math.floor(Math.random() * posts.length)];
          setCurrentPost(randomPost);
          setIsChanging(false);
        }, 500);
      }, 15000);

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      }, AUTO_SLIDE_DURATION);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        intervalRef.current = null;
        timeoutRef.current = null;
      };
    }
  }, [inView, posts.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="mt-16"
    >
      <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        실시간 사용자 글
      </h3>

      <div className="w-full">
        <div className="relative h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-gray-800 pointer-events-none" />

          <AnimatePresence mode="wait">
            {currentPost && (
              <motion.div
                key={currentPost._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                      {currentPost.user.displayName[0]}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold">{currentPost.user.displayName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentPost.mode === 'mode_300' ? '300자 글쓰기' : '1000자 글쓰기'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    좋아요 {currentPost.likeCount}개
                  </div>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentPost.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {isChanging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80"
            >
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}
        </div>

        <div
          className="
            mt-6 text-center
            text-lg sm:text-xl md:text-2xl font-bold
            bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500
            bg-clip-text text-transparent
            font-nanum-pen
          "
        >
          매일 수많은 사용자들이 글을 쓰고 피드백을 주고 받으며 자신의 생각을 나누고 있어요
        </div>
      </div>
    </motion.div>
  );
};

export default UserPostSection;
