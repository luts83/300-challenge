// routes/landing.js
const express = require("express");
const router = express.Router();
const fetchCurrentFormLink = require("../utils/fetchCurrentFormLink");
const fetchCurrentTheme = require("../utils/fetchCurrentTheme");

// 현재 기수 폼 링크 가져오기
router.get("/current-form-link", async (req, res) => {
  try {
    const formLink = await fetchCurrentFormLink();
    res.json({
      success: true,
      data: {
        formLink: formLink,
      },
    });
  } catch (error) {
    console.error("폼 링크 가져오기 오류:", error);
    res.status(500).json({
      success: false,
      message: "폼 링크를 가져오는데 실패했습니다.",
    });
  }
});

// 현재 월간 테마 정보 가져오기
router.get("/current-theme", async (req, res) => {
  try {
    const result = await fetchCurrentTheme();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("테마 정보 가져오기 오류:", error);
    res.status(500).json({
      success: false,
      message: "테마 정보를 가져오는데 실패했습니다.",
    });
  }
});

module.exports = router;
