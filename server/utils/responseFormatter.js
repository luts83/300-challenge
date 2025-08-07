const formatResponse = (data, message = "성공", success = true) => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString(),
});

// submitController.js에서 사용 예시:
// return res.status(200).json(
//   formatResponse({
//     submission: {
//       id: submission._id,
//       mode: submission.mode,
//     },
//     tokens: {
//       regular: userToken[tokenField],
//       golden: userToken.goldenKeys,
//     },
//     streak: {
//       progress: streak.weeklyProgress,
//       completed: allDaysCompleted,
//       shouldShowCelebration: allDaysCompleted && !streak.celebrationShown,
//     },
//   })
// );

// 평가 항목별 점수 가중치를 적용하여 최종 점수 계산
function calculateWeightedScore(criteriaScores, mode, isAssignedTopic) {
  const CONFIG = require("../config");

  // 모드별 가중치 선택
  const modeWeights =
    mode === "mode_300"
      ? CONFIG.AI.EVALUATION_CRITERIA.MODE_300
      : CONFIG.AI.EVALUATION_CRITERIA.MODE_1000;

  const weights = isAssignedTopic ? modeWeights.ASSIGNED : modeWeights.FREE;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  // 각 평가 항목에 대해 가중치 적용
  Object.keys(criteriaScores).forEach((criteria) => {
    const score = criteriaScores[criteria].score || criteriaScores[criteria];
    const weight = weights[criteria.toUpperCase()]?.weight || 0.1; // 기본값 0.1

    if (score !== undefined && score !== null && !isNaN(score)) {
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }
  });

  // 가중치가 적용된 최종 점수 계산
  const finalScore =
    totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  console.log(`📊 가중치 적용된 점수 계산:`, {
    mode,
    isAssignedTopic,
    criteriaScores,
    weights: Object.keys(weights).map((k) => ({ [k]: weights[k].weight })),
    totalWeightedScore,
    totalWeight,
    finalScore,
  });

  return finalScore;
}

module.exports = {
  formatResponse,
  calculateWeightedScore,
};
