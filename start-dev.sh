#!/bin/bash

echo "🚀 300 Challenge 개발 환경 시작하기"
echo "=================================="

# Docker 상태 확인
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker가 실행되지 않았습니다."
    echo "   Docker Desktop을 실행하고 다시 시도해주세요."
    echo "   Applications 폴더 → Docker.app 실행"
    exit 1
fi

echo "✅ Docker가 실행 중입니다."

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "⚠️  .env 파일이 없습니다."
    echo "   .env.example을 참고하여 .env 파일을 생성해주세요."
    echo "   또는 다음 명령어로 기본 환경 변수를 설정할 수 있습니다:"
    echo "   cp .env.example .env"
    exit 1
fi

echo "✅ 환경 변수 파일이 설정되었습니다."

# 컨테이너 실행
echo "🐳 Docker 컨테이너를 시작합니다..."
docker-compose up -d

echo ""
echo "🎉 개발 환경이 시작되었습니다!"
echo ""
echo "📱 클라이언트: http://localhost:3000"
echo "🔧 서버 API: http://localhost:5000"
echo "🗄️  MongoDB: localhost:27017"
echo ""
echo "📋 유용한 명령어:"
echo "   로그 확인: docker-compose logs -f"
echo "   서비스 중지: docker-compose down"
echo "   특정 서비스만 실행: docker-compose up mongodb server"
echo ""
echo "🔍 컨테이너 상태 확인:"
docker-compose ps
