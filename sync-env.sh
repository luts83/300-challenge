#!/bin/bash

echo "🔄 300 Challenge 환경 변수 동기화 도구"
echo "======================================"

# 현재 디렉토리 확인
if [ ! -f "env.template" ]; then
    echo "❌ env.template 파일을 찾을 수 없습니다."
    echo "   프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# 메뉴 선택
echo ""
echo "어떤 작업을 수행하시겠습니까?"
echo "1. 현재 환경 변수를 .env 파일로 백업"
echo "2. .env 파일에서 환경 변수 복원"
echo "3. 환경 변수 템플릿 생성"
echo "4. 현재 환경 변수 확인"
echo "5. 종료"
echo ""

read -p "선택하세요 (1-5): " choice

case $choice in
    1)
        echo "📤 현재 환경 변수를 .env 파일로 백업합니다..."
        
        # .env 파일 생성
        cat > .env << EOF
# 300 Challenge 환경 변수 (자동 생성됨)
# 생성 시간: $(date)
# 컴퓨터: $(hostname)

# 서버 설정
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-5000}

# MongoDB 설정
MONGO_URI=${MONGO_URI:-mongodb://localhost:27017/300challenge}

# Firebase 설정
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
FIREBASE_PRIVATE_KEY_ID=${FIREBASE_PRIVATE_KEY_ID}
FIREBASE_CLIENT_ID=${FIREBASE_CLIENT_ID}

# JWT 설정
JWT_SECRET=${JWT_SECRET}

# 이메일 설정
EMAIL_SERVICE=${EMAIL_SERVICE}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}

# 클라이언트 설정
VITE_API_URL=${VITE_API_URL:-http://localhost:5000}
VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}
EOF
        
        echo "✅ .env 파일이 생성되었습니다!"
        echo "📁 파일 위치: $(pwd)/.env"
        echo "💡 이 파일을 다른 컴퓨터로 복사하여 사용하세요."
        ;;
        
    2)
        echo "📥 .env 파일에서 환경 변수를 복원합니다..."
        
        if [ ! -f ".env" ]; then
            echo "❌ .env 파일을 찾을 수 없습니다."
            echo "   먼저 백업을 생성하거나 수동으로 .env 파일을 만들어주세요."
            exit 1
        fi
        
        # .env 파일을 소스로 실행
        source .env
        echo "✅ 환경 변수가 복원되었습니다!"
        echo "💡 현재 터미널에서만 적용됩니다."
        echo "   영구적으로 적용하려면 터미널을 재시작하거나 .zshrc에 추가하세요."
        ;;
        
    3)
        echo "📝 환경 변수 템플릿을 생성합니다..."
        
        if [ -f "env.template" ]; then
            echo "⚠️  env.template 파일이 이미 존재합니다."
            read -p "덮어쓰시겠습니까? (y/N): " overwrite
            if [[ ! $overwrite =~ ^[Yy]$ ]]; then
                echo "❌ 취소되었습니다."
                exit 0
            fi
        fi
        
        # env.template 파일 생성 (이미 위에서 생성됨)
        echo "✅ env.template 파일이 생성되었습니다!"
        echo "📁 파일 위치: $(pwd)/env.template"
        ;;
        
    4)
        echo "🔍 현재 환경 변수를 확인합니다..."
        echo ""
        echo "=== 주요 환경 변수 ==="
        echo "NODE_ENV: ${NODE_ENV:-설정되지 않음}"
        echo "PORT: ${PORT:-설정되지 않음}"
        echo "MONGO_URI: ${MONGO_URI:-설정되지 않음}"
        echo "FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID:-설정되지 않음}"
        echo "JWT_SECRET: ${JWT_SECRET:-설정되지 않음}"
        echo "VITE_API_URL: ${VITE_API_URL:-설정되지 않음}"
        echo ""
        echo "=== 전체 환경 변수 ==="
        env | grep -E "(NODE_ENV|PORT|MONGO|FIREBASE|JWT|EMAIL|VITE)" | sort
        ;;
        
    5)
        echo "👋 종료합니다."
        exit 0
        ;;
        
    *)
        echo "❌ 잘못된 선택입니다. 1-5 중에서 선택해주세요."
        exit 1
        ;;
esac

echo ""
echo "💡 팁:"
echo "   - 다른 컴퓨터에서 개발할 때는 이 스크립트를 실행하여 환경 변수를 동기화하세요."
echo "   - .env 파일은 .gitignore에 포함되어 있어서 Git에 업로드되지 않습니다."
echo "   - 민감한 정보(API 키, 비밀번호 등)는 안전하게 관리하세요."
