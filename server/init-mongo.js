// MongoDB 초기화 스크립트
db = db.getSiblingDB('300challenge');

// 기본 컬렉션 생성
db.createCollection('users');
db.createCollection('submissions');
db.createCollection('feedback');
db.createCollection('tokens');
db.createCollection('drafts');

// 인덱스 생성
db.users.createIndex({ "email": 1 }, { unique: true });
db.submissions.createIndex({ "userId": 1, "createdAt": -1 });
db.feedback.createIndex({ "submissionId": 1 });
db.tokens.createIndex({ "userId": 1 });

print('MongoDB 초기화 완료!');
