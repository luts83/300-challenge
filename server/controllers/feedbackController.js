const CONFIG = require("../config");
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const logger = require("../utils/logger");
const { sendFeedbackEmail } = require("../utils/emailService");
const User = require("../models/User");
const {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
} = require("./userController");
const { getUserTodayDate } = require("../utils/timezoneUtils");
const { getTodayDateKoreaFinal } = require("../utils/timezoneUtils");

/**
 * UTC 오프셋을 기반으로 대략적인 위치 정보를 반환
 * @param {number} offsetHours - UTC 기준 시간 차이 (시간 단위)
 * @returns {string} 위치 정보
 */
const getLocationByOffset = (offsetHours) => {
  const locationMap = {
    "-12": "🇺🇸 하와이",
    "-11": "🇺🇸 알래스카",
    "-10": "🇺🇸 하와이",
    "-9": "🇺🇸 알래스카",
    "-8": "🇺🇸 로스앤젤레스",
    "-7": "🇺🇸 덴버",
    "-6": "🇺🇸 시카고",
    "-5": "🇺🇸 뉴욕",
    "-4": "🇺🇸 뉴욕 (서머타임)",
    "-3": "🇧🇷 상파울루",
    "-2": "🇧🇷 상파울루 (서머타임)",
    "-1": "🇵🇹 아조레스",
    0: "🇬🇧 런던",
    1: "🇬🇧 런던 (서머타임) / 🇫🇷 파리 / 🇩🇪 베를린",
    2: "🇺🇦 키예프 / 🇹🇷 이스탄불",
    3: "🇷🇺 모스크바",
    4: "🇷🇺 모스크바 (서머타임)",
    5: "🇮🇳 뭄바이",
    5.5: "🇮🇳 뭄바이",
    6: "🇰🇿 알마티",
    7: "🇹🇭 방콕",
    8: "🇨🇳 베이징 / 🇭🇰 홍콩",
    9: "🇰🇷 서울 / 🇯🇵 도쿄",
    10: "🇦🇺 시드니",
    11: "🇦🇺 시드니 (서머타임)",
    12: "🇳🇿 오클랜드",
    13: "🇳🇿 오클랜드 (서머타임)",
  };

  // 가장 가까운 오프셋 찾기
  const closestOffset = Object.keys(locationMap).reduce((prev, curr) => {
    return Math.abs(curr - offsetHours) < Math.abs(prev - offsetHours)
      ? curr
      : prev;
  });

  return locationMap[closestOffset] || `알 수 없는 지역`;
};

// 피드백 가능 여부 확인 함수
const canGiveFeedback = async (uid, userTimezone = null, userOffset = null) => {
  try {
    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName");
    const userEmail = user ? user.email : "unknown";

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (userTimezone && userOffset !== null) {
      todayString = getUserTodayDate(userOffset); // ✅ getUserTodayDate는 userOffset만 받음
      console.log(
        `🌍 [canGiveFeedback] ${userEmail} - 사용자 시간대 기준 날짜: ${userTimezone} (offset: ${userOffset}) -> ${todayString}`
      );
    } else {
      todayString = getTodayDateKoreaFinal();
      console.log(
        `🇰🇷 [canGiveFeedback] ${userEmail} - 한국 시간 기준 날짜 (기본값): ${todayString}`
      );
    }

    // 1. 오늘 글을 썼는지 확인 (writtenDate 기준)
    const todaySubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: todayString, // writtenDate 기준으로 확인
    });

    if (!todaySubmission) {
      console.log(
        `❌ [canGiveFeedback] ${userEmail} - 오늘 글을 쓰지 않음: ${todayString}`
      );
      return {
        canGive: false,
        reason: "오늘 글을 작성해야 피드백을 남길 수 있습니다.",
        todayString,
      };
    }

    // 2. 오늘 피드백을 몇 개 남겼는지 확인 (writtenDate 기준)
    const todayFeedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: todayString, // writtenDate 기준으로 확인
    });

    // 3. 피드백 제한 확인 (하루 최대 5개)
    if (todayFeedbackCount >= 5) {
      return {
        canGive: false,
        reason: "하루 최대 5개의 피드백을 작성할 수 있습니다.",
        todayString,
        todayFeedbackCount,
      };
    }

    return {
      canGive: true,
      reason: "피드백 작성 가능",
      todayString,
      todayFeedbackCount,
    };
  } catch (error) {
    console.error(`❌ [canGiveFeedback] ${userEmail} - 오류:`, error);
    throw error;
  }
};

// 피드백 대상 글 조회 API
const getAvailableSubmissions = async (req, res) => {
  try {
    const { uid } = req.params;
    const { timezone, offset } = req.query;

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (timezone && offset !== undefined) {
      todayString = getUserTodayDate(parseInt(offset)); // ✅ getUserTodayDate는 userOffset만 받음
      // 사용자 시간대 기준으로 현재 시간 계산
      const userNow = new Date(
        new Date().getTime() - parseInt(offset) * 60 * 1000
      );
      console.log(
        `🌍 [getAvailableSubmissions] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString} (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
      );
    } else {
      todayString = getTodayDateKoreaFinal();
      console.log(
        `🇰🇷 [getAvailableSubmissions] 한국 시간 기준 날짜 (기본값): ${todayString}`
      );
    }

    // 1. 사용자가 오늘 글을 썼는지 확인 (writtenDate 기준)
    const userTodaySubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: todayString, // writtenDate 기준으로 확인
    });

    if (!userTodaySubmission) {
      return res.status(403).json({
        message: "오늘 글을 작성해야 피드백을 남길 수 있습니다.",
        todayString,
      });
    }

    // 2. 오늘 이미 피드백을 몇 개 남겼는지 확인 (writtenDate 기준)
    const todayFeedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: todayString, // writtenDate 기준으로 확인
    });

    // 3. 피드백 제한 확인 (하루 최대 5개)
    if (todayFeedbackCount >= 5) {
      return res.status(403).json({
        message: "하루 최대 5개의 피드백을 작성할 수 있습니다.",
        todayString,
        todayFeedbackCount,
      });
    }

    // 4. 피드백 가능한 글 찾기 (writtenDate 기준으로 필터링)
    const availableSubmissions = await Submission.find({
      submissionDate: todayString, // writtenDate 기준으로 확인
      "user.uid": { $ne: uid }, // 자신의 글 제외
      feedbackUnlocked: true, // 피드백이 언락된 글만
    }).populate("user", "displayName email");

    console.log(
      `📝 [getAvailableSubmissions] 피드백 가능한 글: ${availableSubmissions.length}개`
    );

    // 사용자 정보 조회
    const User = require("../models/User");
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      submissions: availableSubmissions,
      todayString,
      todayFeedbackCount,
      maxFeedbackCount: 5,
    });
  } catch (error) {
    console.error("❌ [getAvailableSubmissions] 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 피드백 제출 API
exports.submitFeedback = async (req, res) => {
  const {
    toSubmissionId,
    fromUid,
    strengths,
    improvements,
    overall,
    content, // ✅ Aug 22일 버전 호환성을 위해 content 필드 추가
    userTimezone,
    userOffset,
  } = req.body;

  // 🔍 간단한 유저 시간 로깅 (제거 - 불필요한 반복 로그 방지)
  // const { logUserTime } = require("../utils/timezoneUtils");
  // logUserTime(
  //   req.user?.email || "Unknown",
  //   userTimezone || "Unknown",
  //   userOffset || 0
  // );

  // ✅ Aug 22일 버전 호환성을 위한 필드 처리
  const feedbackContent = overall || content;

  // 구조화된 피드백 검증
  if (
    !feedbackContent ||
    feedbackContent.trim().length <
      CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL
  ) {
    return res.status(400).json({
      message: "전체적인 느낌을 15자 이상 작성해주세요.",
    });
  }

  // strengths와 improvements는 선택사항이므로 검증 로직 완전 제거
  // 현재 설정에서 최소 길이가 0이므로 검증이 의미가 없음

  try {
    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (userOffset !== undefined && userTimezone) {
      // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
      const { getUserTodayDate } = require("../utils/timezoneUtils");
      const userToday = getUserTodayDate(userOffset);
      todayString = userToday; // getUserTodayDate는 이미 문자열 반환
      console.log(
        `🌍 사용자 시간대 기준 날짜 계산: ${userTimezone} (offset: ${userOffset}) -> ${todayString}`
      );
    } else {
      // 기본값: 한국 시간 기준
      const today = getTodayDateKoreaFinal();
      todayString = today.toISOString().slice(0, 10);
      console.log(`🇰🇷 한국 시간 기준 날짜 계산 (기본값): ${todayString}`);
    }

    // 중복 피드백 체크 강화 (오늘 날짜 기준으로도 체크)
    const existingFeedback = await Feedback.findOne({
      toSubmissionId,
      fromUid,
      writtenDate: todayString, // 오늘 날짜 기준으로도 중복 체크
    });

    if (existingFeedback) {
      return res.status(400).json({
        message: "이미 이 글에 피드백을 작성하셨습니다.",
      });
    }

    // 추가 안전장치: 전체 기간 중복 체크
    const anyExistingFeedback = await Feedback.findOne({
      toSubmissionId,
      fromUid,
    });

    if (anyExistingFeedback) {
      return res.status(400).json({
        message: "이미 이 글에 피드백을 작성하셨습니다.",
      });
    }

    // 1. 피드백 대상 글 정보 가져오기
    const targetSubmission = await Submission.findById(toSubmissionId);
    if (!targetSubmission) {
      return res
        .status(404)
        .json({ message: "피드백 대상 글을 찾을 수 없습니다." });
    }

    // 2. 피드백 작성자 정보 가져오기
    const fromUser = await Submission.findOne({ "user.uid": fromUid })
      .select("user")
      .sort({ createdAt: -1 });

    if (!fromUser) {
      return res
        .status(404)
        .json({ message: "피드백 작성자 정보를 찾을 수 없습니다." });
    }

    // 3. 피드백 대상 사용자 정보 가져오기 (이메일 알림용)
    const targetUser = await User.findOne({
      email: targetSubmission.user.email,
    });

    // 비화이트리스트 유저 활동 로깅
    await detectNonWhitelistedUserActivity("피드백 제출", {
      email: fromUser.user.email,
      displayName:
        fromUser.user.displayName || fromUser.user.email.split("@")[0],
      uid: fromUid,
    });

    // 3. 피드백 작성 가능 여부 확인
    try {
      const canGive = await canGiveFeedback(fromUid, userTimezone, userOffset);
      if (!canGive.canGive) {
        return res.status(403).json({ message: canGive.reason });
      }
    } catch (err) {
      return res.status(403).json({ message: err.message });
    }

    // 5. 피드백 저장
    const savedFeedback = await (async () => {
      const newFeedback = new Feedback({
        // 피드백 대상 글 정보
        toSubmissionId: targetSubmission._id,
        submissionTitle: targetSubmission.title,
        submissionText: targetSubmission.text,
        submissionMode: targetSubmission.mode,

        // 원글 작성자 정보
        toUser: {
          uid: targetSubmission.user.uid,
          displayName: targetSubmission.user.displayName,
          email: targetSubmission.user.email,
        },

        // 피드백 작성자 정보
        fromUid,
        fromUser: {
          displayName: fromUser.user.displayName,
          email: fromUser.user.email,
        },

        // 피드백 작성자 시간대 정보
        fromUserTimezone: userTimezone || "Asia/Seoul",
        fromUserOffset: typeof userOffset === "number" ? userOffset : -540,

        // 구조화된 피드백 내용
        strengths:
          strengths && strengths.trim().length > 0 ? strengths.trim() : null,
        improvements:
          improvements && improvements.trim().length > 0
            ? improvements.trim()
            : null,
        overall: feedbackContent || null, // ✅ 통합된 피드백 내용 사용
        content: `전체적인 느낌:\n${feedbackContent}${
          strengths && strengths.trim().length > 0
            ? `\n\n마음에 드는 부분:\n${strengths.trim()}`
            : ""
        }${
          improvements && improvements.trim().length > 0
            ? `\n\n더 멋진 방향:\n${improvements.trim()}`
            : ""
        }`, // 하위 호환성

        // 피드백 작성 날짜 - 사용자 시간대 기준
        writtenDate: todayString, // canGiveFeedback에서 계산된 날짜 사용

        // 원글 작성 날짜 - 피드백 대상 글의 원래 작성 날짜
        submissionCreatedAt: targetSubmission.createdAt,

        // 피드백 상태
        isRead: false,
        isHelpful: null,
      });

      try {
        return await newFeedback.save();
      } catch (error) {
        // 🚨 스키마 레벨 검증 에러 처리
        if (error.name === "DuplicateFeedbackError") {
          console.log(
            `🚫 스키마 레벨 중복 피드백 감지: ${fromUid} -> ${toSubmissionId}`
          );
          throw new Error("이미 이 글에 피드백을 작성하셨습니다.");
        }
        throw error;
      }
    })();

    // 이메일 알림 설정에 따라 전송 (비동기 처리로 UX 개선)
    if (targetUser && targetUser.feedbackNotification === true) {
      // ✅ 비동기 이메일 전송으로 피드백 제출 지연 방지
      setImmediate(async () => {
        const emailStartTime = Date.now();
        try {
          // ✅ 이메일 전송 시작 로깅
          console.log(
            `📧 [이메일 전송 시작] ${targetSubmission.user.email}에게 피드백 알림 전송 시도`
          );

          const emailResult = await sendFeedbackEmail(
            savedFeedback,
            targetSubmission
            // canViewFeedback 파라미터 제거 - 이전 버전과 동일하게
          );

          const emailDuration = Date.now() - emailStartTime;

          if (emailResult) {
            // ✅ 이메일 전송 성공 로깅
            console.log(
              `✅ [이메일 전송 성공] ${targetSubmission.user.email}에게 피드백 알림 전송 완료 (${emailDuration}ms)`
            );

            // ✅ 성공 통계 로깅 (모니터링용)
            logger.info("피드백 알림 이메일 전송 성공", {
              recipient: targetSubmission.user.email,
              feedbackId: savedFeedback._id,
              submissionId: targetSubmission._id,
              duration: emailDuration,
              timestamp: new Date().toISOString(),
            });
          } else {
            // ✅ 이메일 전송 실패 로깅
            console.log(
              `❌ [이메일 전송 실패] ${targetSubmission.user.email}에게 피드백 알림 전송 실패 (${emailDuration}ms)`
            );

            // ✅ 실패 통계 로깅 (모니터링용)
            logger.warn("피드백 알림 이메일 전송 실패", {
              recipient: targetSubmission.user.email,
              feedbackId: savedFeedback._id,
              submissionId: targetSubmission._id,
              duration: emailDuration,
              timestamp: new Date().toISOString(),
            });

            // 🚨 이메일 전송 실패 시 관리자 알림 (선택사항)
            if (process.env.ADMIN_EMAIL) {
              try {
                const { sendFeedbackEmail } = require("../utils/emailService");

                // 관리자에게 이메일 전송 실패 알림
                const adminNotification = {
                  _id: new mongoose.Types.ObjectId(),
                  content: `이메일 전송 실패: ${targetSubmission.user.email}`,
                  fromUid: "system",
                  toSubmissionId: targetSubmission._id,
                  createdAt: new Date(),
                };

                const adminSubmission = {
                  _id: targetSubmission._id,
                  title: targetSubmission.title,
                  user: {
                    email: process.env.ADMIN_EMAIL,
                    displayName: "관리자",
                  },
                };

                await sendFeedbackEmail(
                  adminNotification,
                  adminSubmission,
                  true,
                  0
                );

                console.log(
                  `📧 [관리자 알림] ${process.env.ADMIN_EMAIL}에게 이메일 전송 실패 알림 전송`
                );
              } catch (adminError) {
                console.error("관리자 알림 처리 실패:", adminError);
              }
            }
          }
        } catch (emailError) {
          const emailDuration = Date.now() - emailStartTime;

          // ✅ 이메일 전송 에러 상세 로깅
          console.error(
            `💥 [이메일 전송 에러] ${targetSubmission.user.email}에게 피드백 알림 전송 중 에러 발생 (${emailDuration}ms):`,
            emailError
          );

          // ✅ 에러 통계 로깅 (모니터링용)
          logger.error("피드백 알림 이메일 전송 에러", {
            recipient: targetSubmission.user.email,
            feedbackId: savedFeedback._id,
            submissionId: targetSubmission._id,
            duration: emailDuration,
            error: emailError.message,
            errorCode: emailError.code,
            stack: emailError.stack,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    // Submission 모델의 hasGivenFeedback 필드 업데이트
    await Submission.findByIdAndUpdate(toSubmissionId, {
      $inc: { feedbackCount: 1 },
    });

    // 6. 오늘 작성한 피드백 수 확인 (모드별로 구분) - 사용자 시간대 기준

    // 먼저 오늘 작성한 피드백들을 가져옴
    const todayFeedbacks = await Feedback.find({
      fromUid,
      writtenDate: todayString,
    }).populate("toSubmissionId", "mode");

    // 모드별로 피드백 수 계산
    const mode300FeedbackCount = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId.mode === "mode_300"
    ).length;

    const mode1000FeedbackCount = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId.mode === "mode_1000"
    ).length;

    // 300자 모드를 위한 총 피드백 수 (300자 + 1000자 모두 포함)
    const totalFeedbackCount = mode300FeedbackCount + mode1000FeedbackCount;

    // 7. 사용자가 작성한 글의 모드 확인
    const userSubmissions = await Submission.find({
      "user.uid": fromUid,
      submissionDate: todayString,
    });

    // 8. 모드별로 피드백 언락 조건 체크 및 업데이트
    for (const submission of userSubmissions) {
      let shouldUnlock = false;

      if (submission.mode === "mode_300") {
        // 300자 모드: 300자 또는 1000자 피드백을 포함한 총 3개 이상의 피드백 작성
        // writtenDate 기준으로 판단 (사용자 경험과 일치)
        shouldUnlock = totalFeedbackCount >= CONFIG.FEEDBACK.REQUIRED_COUNT;
      } else if (submission.mode === "mode_1000") {
        // 1000자 모드: 1000자 피드백 1개 이상 작성
        // writtenDate 기준으로 판단 (사용자 경험과 일치)
        shouldUnlock = mode1000FeedbackCount >= 1;
      }

      if (shouldUnlock) {
        await Submission.findByIdAndUpdate(submission._id, {
          feedbackUnlocked: true,
        });
      }
    }

    res.status(200).json({
      message: "피드백이 성공적으로 저장되었습니다!",
      feedback: savedFeedback,
      todayFeedbackCount: {
        mode_300: mode300FeedbackCount,
        mode_1000: mode1000FeedbackCount,
        total: totalFeedbackCount, // 총 피드백 수도 응답에 포함
      },
      // 교차 피드백 정보 추가
      crossModeInfo: {
        mode300Unlocked: userSubmissions.some(
          (sub) =>
            sub.mode === "mode_300" &&
            mode300FeedbackCount + mode1000FeedbackCount >=
              CONFIG.FEEDBACK.REQUIRED_COUNT
        ),
        mode1000Unlocked: userSubmissions.some(
          (sub) => sub.mode === "mode_1000" && mode1000FeedbackCount >= 1
        ),
        mode300Progress: {
          direct: mode300FeedbackCount,
          crossMode: mode1000FeedbackCount,
          total: totalFeedbackCount,
          required: CONFIG.FEEDBACK.REQUIRED_COUNT,
          remaining: Math.max(
            0,
            CONFIG.FEEDBACK.REQUIRED_COUNT - totalFeedbackCount
          ),
        },
        mode1000Progress: {
          direct: mode1000FeedbackCount,
          required: 1,
          remaining: Math.max(0, 1 - mode1000FeedbackCount),
        },
      },
    });
  } catch (error) {
    console.error("피드백 저장 중 오류 발생:", error);
    res.status(500).json({ message: "피드백 저장 중 오류가 발생했습니다." });
  }
};

// 피드백 미션 할당 API도 수정
const assignFeedbackMissions = async (req, res) => {
  try {
    const { uid } = req.body;
    const { timezone, offset } = req.body;

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (offset !== undefined && timezone) {
      todayString = getUserTodayDate(offset); // ✅ getUserTodayDate는 userOffset만 받음
      console.log(
        `🌍 [assignFeedbackMissions] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString}`
      );
    } else {
      todayString = getTodayDateKoreaFinal();
      console.log(
        `🇰🇷 [assignFeedbackMissions] 한국 시간 기준 날짜 (기본값): ${todayString}`
      );
    }

    // 1. 사용자가 오늘 글을 썼는지 확인 (writtenDate 기준)
    const userTodaySubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: todayString, // writtenDate 기준으로 확인
    });

    if (!userTodaySubmission) {
      return res.status(403).json({
        message: "오늘 글을 작성해야 피드백 미션을 받을 수 있습니다.",
        todayString,
      });
    }

    // 2. 오늘 이미 피드백을 몇 개 남겼는지 확인 (writtenDate 기준)
    const todayFeedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: todayString, // writtenDate 기준으로 확인
    });

    // 3. 피드백 미션 할당 (writtenDate 기준으로 계산)
    const missions = [];

    // 300자 모드 미션
    if (userTodaySubmission.mode === "mode_300") {
      missions.push({
        type: "mode_300",
        target: 3,
        current: todayFeedbackCount,
        remaining: Math.max(0, 3 - todayFeedbackCount),
        description: "300자 모드 글에 피드백 3개 작성",
      });
    }

    // 1000자 모드 미션
    if (userTodaySubmission.mode === "mode_1000") {
      missions.push({
        type: "mode_1000",
        target: 1,
        current: todayFeedbackCount,
        remaining: Math.max(0, 1 - todayFeedbackCount),
        description: "1000자 모드 글에 피드백 1개 작성",
      });
    }

    // 사용자 정보 조회
    const User = require("../models/User");
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      missions,
      todayString,
      todayFeedbackCount,
      userMode: userTodaySubmission.mode,
    });
  } catch (error) {
    console.error("❌ [assignFeedbackMissions] 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 함수들을 export
module.exports = {
  submitFeedback: exports.submitFeedback,
  getFeedbackStatus: exports.getFeedbackStatus,
  getTodayFeedbacks: exports.getTodayFeedbacks,
  getGivenTodayFeedbacks: exports.getGivenTodayFeedbacks,
  getSystemTodayFeedbacks: exports.getSystemTodayFeedbacks,
  getAvailableSubmissions,
  assignFeedbackMissions,
  canGiveFeedback,
};
