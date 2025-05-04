// src/components/HelpfulButton.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext'; // ✅ 정확한 경로로

type HelpfulButtonProps = {
  submissionId: string;
};

type LikeDisplayProps = {
    likeCount: number;
    likedUsernames?: string[];
  };

// ❤️ 클릭 가능한 버튼
const HelpfulButton = ({ submissionId }: HelpfulButtonProps) => {
  const { user } = useUser();
  const userUid = user?.uid;
  const userDisplayName = user?.displayName || '익명';

  const [liked, setLiked] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchStatus = async () => {
    if (!submissionId || !userUid) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/${submissionId}/like-status`,
        { params: { uid: userUid } }
      );
      setLiked(res.data.liked);
      setTotal(res.data.total);
    } catch (err) {
      console.error('좋아요 상태 불러오기 실패:', err);
    }
  };

  const toggleLike = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/feedback/${submissionId}/like`,
        { uid: userUid, displayName: userDisplayName }
      );
      setLiked(res.data.liked);
      setTotal(res.data.total);
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  useEffect(() => {
    if (userUid) fetchStatus();
  }, [submissionId, userUid]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike();
      }}
      className="flex items-center text-sm text-gray-600 hover:text-red-500 transition-all"
    >
      <span className={`text-xl ${liked ? 'text-red-500' : 'text-gray-400'}`}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span className="ml-1">{total}</span>
    </button>
  );
};

// ❤️ 결과만 보여주는 컴포넌트
export const LikeDisplay = ({
    likeCount,
    likedUsernames = [],
  }: LikeDisplayProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
  
    const isLiked = likeCount > 0;
    const tooltipText =
      likedUsernames.length > 0
        ? `좋아요한 사람: ${likedUsernames.join(', ')}`
        : '아직 아무도 좋아요를 누르지 않았어요';
  
    return (
      <div
        className="relative flex items-center text-sm text-gray-600"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={`text-xl ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
          {isLiked ? '❤️' : '🤍'}
        </span>
        <span className="ml-1">{likeCount}</span>
  
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-black text-white text-xs rounded px-2 py-1 shadow-lg z-10 whitespace-pre-line">
            {tooltipText}
          </div>
        )}
      </div>
    );
  };
  
  

export default HelpfulButton;
