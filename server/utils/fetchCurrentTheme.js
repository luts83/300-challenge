const { google } = require("googleapis");
const path = require("path");

const fetchCurrentTheme = async () => {
  try {
    let auth;

    // 환경 변수가 있으면 환경 변수 사용, 없으면 파일 사용
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
    } else {
      const SERVICE_ACCOUNT_FILE = path.join(
        __dirname,
        "../firebase-service-account.json"
      );
      auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
    }

    const sheets = google.sheets({
      version: "v4",
      auth: await auth.getClient(),
    });

    const SPREADSHEET_ID =
      process.env.SPREADSHEET_ID ||
      "1XSERza9LA11zgTDbx02rMQeFo1erCXtvuuLNFLJileE";

    // 테마 정보 가져오기 (E2:G2)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!E2:G2",
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("테마 정보를 찾을 수 없습니다.");
      return {
        success: false,
        data: null,
        message: "테마 정보를 찾을 수 없습니다.",
      };
    }

    const [themeTitle, themeDescription, weeklyTopics] = values[0];

    // 주차별 주제 파싱 (JSON 형태로 저장되어 있다고 가정)
    let parsedWeeklyTopics = [];
    try {
      if (weeklyTopics) {
        parsedWeeklyTopics = JSON.parse(weeklyTopics);
      }
    } catch (error) {
      console.log("주차별 주제 파싱 실패, 기본값 사용:", error);
      // 기본 주제 구조
      parsedWeeklyTopics = [
        {
          week: 1,
          title: "과거의 나",
          topics: [
            "어릴 적 나의 꿈",
            "가장 후회되는 선택",
            "나에게 큰 영향을 준 사람",
          ],
        },
        {
          week: 2,
          title: "현재의 나",
          topics: [
            "나를 나답게 만드는 성격",
            "요즘 나를 가장 힘들게 하는 것",
            "내가 가진 두려움",
          ],
        },
        {
          week: 3,
          title: "나의 가치관",
          topics: [
            "절대 타협할 수 없는 가치",
            "'행복'이란 무엇일까?",
            "내가 생각하는 '성공'이란",
          ],
        },
        {
          week: 4,
          title: "미래의 나",
          topics: [
            "10년 후 나의 모습",
            "세상에 남기고 싶은 나의 흔적",
            "나에게 해주고 싶은 응원의 말",
          ],
        },
      ];
    }

    return {
      success: true,
      data: {
        themeTitle: themeTitle || "나를 찾아가는 여정",
        themeDescription:
          themeDescription || "한 달간 나의 이야기를 담아보는 특별한 여정",
        weeklyTopics: parsedWeeklyTopics,
      },
    };
  } catch (error) {
    console.error("테마 정보 가져오기 실패:", error);
    return {
      success: false,
      data: null,
      message: "테마 정보를 가져오는데 실패했습니다.",
    };
  }
};

module.exports = fetchCurrentTheme;
