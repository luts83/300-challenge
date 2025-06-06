// utils/fetchWritingTopics.js
const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SERVICE_ACCOUNT_FILE = path.join(
  __dirname,
  "../firebase-service-account.json"
);

const SPREADSHEET_ID = "1wh_PRWxb6BBg5Qcpj3YWXp-nn0kTBqRYvdeVGhAWQiw";

async function fetchTopicsFromSheet(sheetName) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: SCOPES,
    });

    const sheets = google.sheets({
      version: "v4",
      auth: await auth.getClient(),
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:A`,
    });

    const rows = response.data.values || [];
    return rows.map((row) => row[0]).filter(Boolean);
  } catch (err) {
    console.error(`❌ 구글 시트 "${sheetName}" 불러오기 실패:`, err.message);
    return [];
  }
}

module.exports = {
  fetchTopicsFromSheet,
};
