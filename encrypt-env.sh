#!/bin/bash

echo "🔐 300 Challenge 환경 변수 암호화 도구"
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
echo "1. 환경 변수 암호화 (GitHub 업로드용)"
echo "2. 암호화된 파일 복호화"
echo "3. 암호화 키 생성"
echo "4. 종료"
echo ""

read -p "선택하세요 (1-4): " choice

case $choice in
    1)
        echo "🔒 환경 변수를 암호화합니다..."
        
        # 암호화 키 확인
        if [ ! -f ".env.key" ]; then
            echo "⚠️  암호화 키가 없습니다. 먼저 키를 생성해주세요."
            echo "   3번을 선택하여 암호화 키를 생성하세요."
            exit 1
        fi
        
        # .env 파일이 있는지 확인
        if [ ! -f ".env" ]; then
            echo "⚠️  .env 파일이 없습니다. 먼저 환경 변수를 백업해주세요."
            echo "   ./sync-env.sh를 실행하여 1번을 선택하세요."
            exit 1
        fi
        
        # 환경 변수 암호화
        openssl enc -aes-256-cbc -salt -in .env -out .env.encrypted -pass file:.env.key
        
        if [ $? -eq 0 ]; then
            echo "✅ 환경 변수가 암호화되었습니다!"
            echo "📁 암호화된 파일: .env.encrypted"
            echo "💡 이 파일을 GitHub에 업로드할 수 있습니다."
            echo "🔑 복호화하려면 .env.key 파일이 필요합니다."
        else
            echo "❌ 암호화에 실패했습니다."
            exit 1
        fi
        ;;
        
    2)
        echo "🔓 암호화된 파일을 복호화합니다..."
        
        # 암호화 키 확인
        if [ ! -f ".env.key" ]; then
            echo "❌ 암호화 키(.env.key)를 찾을 수 없습니다."
            echo "   메인 컴퓨터에서 .env.key 파일을 복사해주세요."
            exit 1
        fi
        
        # 암호화된 파일 확인
        if [ ! -f ".env.encrypted" ]; then
            echo "❌ 암호화된 파일(.env.encrypted)을 찾을 수 없습니다."
            echo "   GitHub에서 .env.encrypted 파일을 다운로드해주세요."
            exit 1
        fi
        
        # 환경 변수 복호화
        openssl enc -aes-256-cbc -d -in .env.encrypted -out .env -pass file:.env.key
        
        if [ $? -eq 0 ]; then
            echo "✅ 환경 변수가 복호화되었습니다!"
            echo "📁 복호화된 파일: .env"
            echo "💡 이제 ./sync-env.sh를 실행하여 환경 변수를 복원할 수 있습니다."
        else
            echo "❌ 복호화에 실패했습니다."
            echo "   암호화 키가 올바른지 확인해주세요."
            exit 1
        fi
        ;;
        
    3)
        echo "🔑 암호화 키를 생성합니다..."
        
        if [ -f ".env.key" ]; then
            echo "⚠️  암호화 키가 이미 존재합니다."
            read -p "새로 생성하시겠습니까? (y/N): " overwrite
            if [[ ! $overwrite =~ ^[Yy]$ ]]; then
                echo "❌ 취소되었습니다."
                exit 0
            fi
        fi
        
        # 32바이트 랜덤 키 생성
        openssl rand -out .env.key 32
        
        if [ $? -eq 0 ]; then
            echo "✅ 암호화 키가 생성되었습니다!"
            echo "📁 키 파일: .env.key"
            echo "⚠️  이 파일을 안전하게 보관하세요!"
            echo "💡 다른 컴퓨터에서 환경 변수를 복호화하려면 이 키가 필요합니다."
            echo ""
            echo "🔐 키 정보:"
            echo "   크기: $(wc -c < .env.key) bytes"
            echo "   해시: $(openssl dgst -sha256 .env.key | cut -d' ' -f2)"
        else
            echo "❌ 키 생성에 실패했습니다."
            exit 1
        fi
        ;;
        
    4)
        echo "👋 종료합니다."
        exit 0
        ;;
        
    *)
        echo "❌ 잘못된 선택입니다. 1-4 중에서 선택해주세요."
        exit 1
        ;;
esac

echo ""
echo "💡 보안 팁:"
echo "   - .env.key 파일은 절대 GitHub에 업로드하지 마세요!"
echo "   - .env.key 파일은 USB나 안전한 방법으로 전송하세요."
echo "   - .env.encrypted 파일만 GitHub에 업로드하세요."
echo "   - 암호화 키는 분실하지 마세요!"
