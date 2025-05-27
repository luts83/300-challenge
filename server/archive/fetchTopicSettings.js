const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SERVICE_ACCOUNT_FILE = path.join(
  __dirname,
  "../firebase-service-account.json"
);
const SPREADSHEET_ID = "1wh_PRWxb6BBg5Qcpj3YWXp-nn0kTBqRYvdeVGhAWQiw"; // 실제 ID로 대체

async function fetchTopicSettings() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Settings!A2:B`,
  });

  const rows = response.data.values || [];
  const settings = {};

  for (const row of rows) {
    if (row[0] && row[1]) {
      settings[row[0]] = row[1].toLowerCase() === "true" ? true : row[1];
    }
  }

  return settings;
}

module.exports = fetchTopicSettings;
