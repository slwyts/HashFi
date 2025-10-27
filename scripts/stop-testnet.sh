#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🛑 停止 Hardhat 测试网..."

# 从 PID 文件读取
if [ -f /tmp/hardhat.pid ]; then
    PID=$(cat /tmp/hardhat.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        rm /tmp/hardhat.pid
        echo -e "${GREEN}✅ 测试网已停止${NC}"
    else
        echo -e "${RED}⚠️  进程已不存在${NC}"
        rm /tmp/hardhat.pid
    fi
else
    # 备用方案：通过端口查找
    PID=$(lsof -ti:8545)
    if [ ! -z "$PID" ]; then
        kill $PID
        echo -e "${GREEN}✅ 测试网已停止${NC}"
    else
        echo -e "${RED}⚠️  未找到运行中的测试网${NC}"
    fi
fi

# 清理日志
rm -f /tmp/hardhat.log
