// server/utils/regexUtils.js

/**
 * MongoDB 정규표현식에서 사용할 수 있도록 특수문자를 이스케이프 처리
 * @param {string} string - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
const escapeRegex = (string) => {
  if (typeof string !== "string") return string;
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * 검색 쿼리용 정규표현식 객체 생성
 * @param {string} search - 검색할 문자열
 * @param {string} options - 정규표현식 옵션 (기본값: "i")
 * @returns {Object} MongoDB $regex 쿼리 객체
 */
const createRegexQuery = (search, options = "i") => {
  if (!search || typeof search !== "string") return null;
  return { $regex: escapeRegex(search), $options: options };
};

module.exports = {
  escapeRegex,
  createRegexQuery,
};
