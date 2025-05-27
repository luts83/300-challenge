// utils/fetchAllowedEmails.js
const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SERVICE_ACCOUNT_FILE = path.join(
  __dirname,
  "../firebase-service-account.json"
);

const SPREADSHEET_ID = "1XSERza9LA11zgTDbx02rMQeFo1erCXtvuuLNFLJileE";
const RANGE = "Sheet1!A2:B"; // 이메일 + enabled 컬럼

async function fetchAllowedEmailsFromSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  const rows = response.data.values || [];

  // 🔐 enabled 값이 true인 이메일만 허용
  const emails = rows
    .filter((row) => row[0] && row[1]?.toLowerCase() === "true")
    .map((row) => row[0]);

  return emails;
}

module.exports = fetchAllowedEmailsFromSheet;
