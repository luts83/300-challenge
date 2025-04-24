const formatResponse = (data, message = "성공", success = true) => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString(),
});

// submitController.js에서 사용
return res.status(200).json(
  formatResponse({
    submission: {
      id: submission._id,
      mode: submission.mode,
    },
    tokens: {
      regular: userToken[tokenField],
      bonus: userToken.bonusTokens,
    },
    streak: {
      progress: streak.weeklyProgress,
      completed: allDaysCompleted,
      shouldShowCelebration: allDaysCompleted && !streak.celebrationShown,
    },
  })
);
