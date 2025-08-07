// utils/fetchCurrentFormLink.js
const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SPREADSHEET_ID = "1XSERza9LA11zgTDbx02rMQeFo1erCXtvuuLNFLJileE";
const RANGE = "Sheet1!D2:D"; // D열에 현재 기수 폼 링크 저장

async function fetchCurrentFormLink() {
  try {
    let auth;

    // 환경 변수가 있으면 환경 변수 사용, 없으면 파일 사용
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
        scopes: SCOPES,
      });
    } else {
      const SERVICE_ACCOUNT_FILE = path.join(
        __dirname,
        "../firebase-service-account.json"
      );
      auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: SCOPES,
      });
    }

    const sheets = google.sheets({
      version: "v4",
      auth: await auth.getClient(),
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    const currentFormLink = rows[0]?.[0]; // 첫 번째 행의 첫 번째 값

    if (currentFormLink) {
      return currentFormLink;
    } else {
      return "https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform";
    }
  } catch (error) {
    console.error("❌ 폼 링크 가져오기 실패:", error);
    // 실패 시 기본 폼 링크 반환
    return "https://docs.google.com/forms/d/e/1FAIpQLSc09fvgAKZsYmA8o2V9LT2ZBdjSzYII6uEdASZF8WN0YerdiA/viewform";
  }
}

module.exports = fetchCurrentFormLink;
