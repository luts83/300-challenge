const NodeCache = require("node-cache");

// 캐시 설정
const cache = new NodeCache({
  stdTTL: 300, // 5분 기본 TTL
  checkperiod: 60, // 1분마다 만료된 항목 체크
  maxKeys: 1000, // 최대 1000개 키
});

// 캐시 키 생성 함수
const createCacheKey = (prefix, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join("|");
  return `${prefix}:${sortedParams}`;
};

// 사용자 목록 캐시
const userListCache = {
  get: (page, limit, search) => {
    const key = createCacheKey("userList", { page, limit, search });
    return cache.get(key);
  },

  set: (page, limit, search, data) => {
    const key = createCacheKey("userList", { page, limit, search });
    // 검색 결과는 짧게 캐시 (1분)
    const ttl = search ? 60 : 300;
    cache.set(key, data, ttl);
  },

  invalidate: () => {
    const keys = cache.keys();
    const userListKeys = keys.filter((key) => key.startsWith("userList:"));
    cache.del(userListKeys);
  },
};

// 사용자 통계 캐시
const userStatsCache = {
  get: (uid) => {
    const key = `userStats:${uid}`;
    return cache.get(key);
  },

  set: (uid, data) => {
    const key = `userStats:${uid}`;
    // 사용자 통계는 10분간 캐시
    cache.set(key, data, 600);
  },

  invalidate: (uid) => {
    const key = `userStats:${uid}`;
    cache.del(key);
  },

  invalidateAll: () => {
    const keys = cache.keys();
    const statsKeys = keys.filter((key) => key.startsWith("userStats:"));
    cache.del(statsKeys);
  },
};

// 전체 통계 캐시
const overallStatsCache = {
  get: () => {
    return cache.get("overallStats");
  },

  set: (data) => {
    // 전체 통계는 15분간 캐시
    cache.set("overallStats", data, 900);
  },

  invalidate: () => {
    cache.del("overallStats");
  },
};

// 캐시 통계 정보
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate:
      (cache.getStats().hits /
        (cache.getStats().hits + cache.getStats().misses)) *
      100,
  };
};

// 캐시 전체 초기화
const clearAllCache = () => {
  cache.flushAll();
};

module.exports = {
  userListCache,
  userStatsCache,
  overallStatsCache,
  getCacheStats,
  clearAllCache,
};
