FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 5000

# 애플리케이션 실행
CMD ["npm", "start"]
