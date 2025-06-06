// utils/fetchAllowedEmails.js
const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SPREADSHEET_ID = "1XSERza9LA11zgTDbx02rMQeFo1erCXtvuuLNFLJileE";
const RANGE = "Sheet1!A2:B";

async function fetchAllowedEmailsFromSheet() {
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
    const emails = rows
      .filter((row) => row[0] && row[1]?.toLowerCase() === "true")
      .map((row) => row[0]);

    console.log("✅ 허용된 이메일 목록:", emails);
    return emails;
  } catch (error) {
    console.error("❌ 이메일 목록 가져오기 실패:", error);
    // 실패 시 기본 이메일 목록 반환
    return ["ehshin0126@gmail.com"]; // 기본 허용 이메일
  }
}

module.exports = fetchAllowedEmailsFromSheet;
