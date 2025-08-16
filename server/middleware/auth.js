const admin = require("../firebaseAdmin");

/**
 * Firebase ID 토큰을 검증하는 인증 미들웨어
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "인증 토큰이 필요합니다.",
        message: "Authorization 헤더에 Bearer 토큰을 포함해주세요.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Firebase ID 토큰 검증
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 사용자 정보를 request 객체에 추가
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.display_name,
    };

    next();
  } catch (error) {
    console.error("토큰 검증 실패:", error);

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        error: "토큰이 만료되었습니다.",
        message: "다시 로그인해주세요.",
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({
        error: "토큰이 취소되었습니다.",
        message: "다시 로그인해주세요.",
      });
    }

    return res.status(401).json({
      error: "유효하지 않은 토큰입니다.",
      message: "인증에 실패했습니다.",
    });
  }
};

module.exports = { authenticateToken };
