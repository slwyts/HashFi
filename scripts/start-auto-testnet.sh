#!/bin/bash

echo "🚀 启动完整测试环境..."

# 清理旧进程
echo "🧹 清理旧进程..."
pkill -f "hardhat node" || true

# 启动 Hardhat 节点（后台运行）
echo "⛏️  启动 Hardhat 节点..."
npx hardhat node > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!

# 等待节点启动
echo "⏳ 等待节点启动..."
for i in {1..10}; do
    if curl -s -X POST http://localhost:8545 \
       -H "Content-Type: application/json" \
       -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
       > /dev/null 2>&1; then
        echo "✅ 节点启动成功 (PID: $HARDHAT_PID)"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 节点启动失败，查看日志:"
        cat /tmp/hardhat-node.log
        exit 1
    fi
    echo "   等待中... ($i/10)"
    sleep 2
done

# 部署合约
echo "📋 部署合约..."
npx hardhat ignition deploy ignition/modules/FullDeploy.ts --network localhost

# 读取部署的合约地址并更新环境配置
echo "🔄 更新环境配置..."
DEPLOYMENT_FILE="ignition/deployments/chain-31337/deployed_addresses.json"

if [ -f "$DEPLOYMENT_FILE" ]; then
    # 检查是否安装了 jq
    if ! command -v jq &> /dev/null; then
        echo "⚠️  警告: 未安装 jq，无法自动更新合约地址"
        echo "   请手动安装: brew install jq"
    else
        # 读取合约地址
        USDT_ADDRESS=$(jq -r '.["FullDeployModule#USDT"]' "$DEPLOYMENT_FILE")
        HASHFI_ADDRESS=$(jq -r '.["FullDeployModule#HashFi"]' "$DEPLOYMENT_FILE")
        
        # 更新 .env.localnet 文件
        ENV_FILE=".env.localnet"
        
        # 创建临时文件进行更新
        cp "$ENV_FILE" "${ENV_FILE}.tmp"
        
        # 使用 sed 更新合约地址
        sed -i '' "s|VITE_CONTRACT_ADDRESS=.*|VITE_CONTRACT_ADDRESS=$HASHFI_ADDRESS|g" "${ENV_FILE}.tmp"
        sed -i '' "s|VITE_USDT_ADDRESS=.*|VITE_USDT_ADDRESS=$USDT_ADDRESS|g" "${ENV_FILE}.tmp"
        
        # 替换原文件
        mv "${ENV_FILE}.tmp" "$ENV_FILE"
        
        echo "✅ 已更新环境配置:"
        echo "   USDT 合约地址: $USDT_ADDRESS"
        echo "   HashFi 合约地址: $HASHFI_ADDRESS"
    fi
else
    echo "⚠️  警告: 未找到部署记录文件，使用默认地址"
fi

# 给测试地址打币
echo "💰 给测试地址发送资金..."
npx hardhat run scripts/fund-accounts.ts --network localhost

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 测试环境启动完成！"
echo ""
echo "📊 节点信息:"
echo "   RPC URL: http://localhost:8545"
echo "   区块时间: 2 秒自动挖矿"
echo "   PID: $HARDHAT_PID"
echo ""
echo "📝 合约信息:"
if [ -f "$DEPLOYMENT_FILE" ] && command -v jq &> /dev/null; then
    echo "   USDT 合约: $USDT_ADDRESS"
    echo "   HashFi 合约: $HASHFI_ADDRESS"
else
    echo "   合约地址请查看 .env.localnet 文件"
fi
echo "   合约 Owner: 0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966"
echo ""
echo "💰 测试地址已获得:"
echo "   - 1,000 ETH"
echo "   - 100,000 USDT"
echo ""
echo "� 常用操作:"
echo "   时间加速: npm run time 7  # 加速7天"
echo "   停止网络: npm run stop"
echo "   启动前端: npm run dev:local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 保存 PID
echo $HARDHAT_PID > /tmp/hardhat-node.pid

# 根据参数决定是否显示日志
if [ "$1" != "--no-logs" ]; then
    # 实时显示日志
    echo "📊 节点日志 (Ctrl+C 停止显示):"
    tail -f /tmp/hardhat-node.log
else
    echo "📊 测试网已在后台运行，日志文件: /tmp/hardhat-node.log"
    echo "   查看日志: tail -f /tmp/hardhat-node.log"
    echo "   停止网络: npm run stop"
fi