#!/bin/bash

# 时间跳跃脚本 - 通过 RPC 调用调整区块链时间
# 使用: ./time-jump.sh 7  (跳跃7天)

if [ -z "$1" ]; then
    echo "❌ 请指定要跳跃的天数"
    echo "用法: $0 <天数>"
    echo "例子: $0 7  # 跳跃7天"
    exit 1
fi

DAYS=$1
SECONDS=$((DAYS * 24 * 60 * 60))
RPC_URL="http://localhost:8545"

echo "⏰ 跳跃时间 $DAYS 天 ($SECONDS 秒)..."

# 检查节点是否运行
if ! curl -s $RPC_URL > /dev/null 2>&1; then
    echo "❌ Hardhat 节点未运行"
    echo "请先运行: ./scripts/start-auto-testnet.sh"
    exit 1
fi

# 获取当前区块时间
echo "📊 当前状态:"
CURRENT_BLOCK=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
  jq -r '.result')

CURRENT_TIME=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",false],"id":1}' | \
  jq -r '.result.timestamp')

CURRENT_TIMESTAMP=$((16#${CURRENT_TIME#0x}))
CURRENT_DATE=$(date -r $CURRENT_TIMESTAMP "+%Y-%m-%d %H:%M:%S")

echo "   区块: $((16#${CURRENT_BLOCK#0x}))"
echo "   时间: $CURRENT_DATE"

# 增加时间
echo ""
echo "🚀 执行时间跳跃..."

INCREASE_RESULT=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"evm_increaseTime\",\"params\":[$SECONDS],\"id\":1}")

# 挖一个新块
MINE_RESULT=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"evm_mine","params":[],"id":1}')

# 获取新的区块信息
NEW_BLOCK=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
  jq -r '.result')

NEW_TIME=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest",false],"id":1}' | \
  jq -r '.result.timestamp')

NEW_TIMESTAMP=$((16#${NEW_TIME#0x}))
NEW_DATE=$(date -r $NEW_TIMESTAMP "+%Y-%m-%d %H:%M:%S")

echo ""
echo "✅ 时间跳跃完成!"
echo "📊 新状态:"
echo "   区块: $((16#${NEW_BLOCK#0x}))"
echo "   时间: $NEW_DATE"
echo "   跳跃: $DAYS 天"