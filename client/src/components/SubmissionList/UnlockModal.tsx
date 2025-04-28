import React from 'react';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (type: 'single' | 'period') => Promise<void>;
  submissionTitle: string;
  bonusTokens: number;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  submissionTitle,
  bonusTokens,
}) => {
  const [unlockType, setUnlockType] = React.useState<'single' | 'period'>('single');
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const getRequiredTokens = (type: 'single' | 'period') => {
    return type === 'single' ? 1 : 2;
  };

  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await onUnlock(unlockType);
      onClose();
    } catch (error) {
      console.error('피드백 언락 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 토큰 부족 메시지 표시 함수
  const getTokenMessage = () => {
    const required = getRequiredTokens(unlockType);
    if (bonusTokens < required) {
      return (
        <div className="mt-2 text-red-500 text-sm">
          {unlockType === 'single'
            ? '⚠️ 피드백 언락을 위해 1개의 보너스 토큰이 필요합니다.'
            : '⚠️ 과거 피드백 언락을 위해 2개의 보너스 토큰이 필요합니다.'}
          <div className="mt-1 text-xs">
            💡 주간 목표(월-금 5일)를 달성하면 보너스 토큰을 획득할 수 있습니다.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">피드백 언락하기</h2>

        <div className="mb-4">
          <p className="text-gray-600">
            보유 중인 보너스 토큰: <span className="font-bold text-blue-600">{bonusTokens}개</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-2">
            <input
              type="radio"
              id="single"
              checked={unlockType === 'single'}
              onChange={() => setUnlockType('single')}
              className="mt-1"
            />
            <label htmlFor="single" className="flex-1">
              <p className="font-medium">이 글의 피드백만 언락하기</p>
              <p className="text-sm text-gray-500">"{submissionTitle}"</p>
              <p className="text-sm text-gray-500">1개의 보너스 토큰 사용</p>
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="radio"
              id="period"
              checked={unlockType === 'period'}
              onChange={() => setUnlockType('period')}
              className="mt-1"
            />
            <label htmlFor="period" className="flex-1">
              <p className="font-medium">이 글을 포함한 과거의 모든 피드백 언락하기</p>
              <p className="text-sm text-gray-500">2개의 보너스 토큰 사용</p>
            </label>
          </div>

          {/* 토큰 부족 메시지 표시 */}
          {getTokenMessage()}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            onClick={handleUnlock}
            disabled={isLoading || bonusTokens < getRequiredTokens(unlockType)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isLoading
              ? '처리 중...'
              : bonusTokens < getRequiredTokens(unlockType)
                ? '토큰 부족'
                : '언락하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
