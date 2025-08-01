// server/controllers/userController.js

const { ACCESS_CONTROL } = require("../config");
const fetchAllowedEmailsFromSheet = require("../utils/fetchAllowedEmails");

async function checkEmailAccess(email) {
  console.log(" checkEmailAccess 호출됨");
  console.log("📧 체크할 이메일:", email);

  try {
    // 실시간으로 구글시트에서 허용된 이메일 목록 가져오기
    const allowedEmails = await fetchAllowedEmailsFromSheet();

    if (!ACCESS_CONTROL.ENABLED) {
      return true;
    }

    const isAllowed = allowedEmails.includes(email);
    console.log("✅ 이메일 접근 권한 확인 완료:", {
      이메일: email,
      허용여부: isAllowed,
      허용된이메일수: allowedEmails.length,
    });
    return isAllowed;
  } catch (error) {
    console.error("❌ 이메일 접근 권한 확인 실패:", error);
    return false;
  }
}

module.exports = {
  checkEmailAccess,
};
