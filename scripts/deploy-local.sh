#!/bin/bash

echo "🚀 HashFi 合约部署测试"
echo "=============================="
echo ""

# 检查是否有 Hardhat 节点在运行
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Hardhat 节点已在运行 (端口 8545)"
else
    echo "❌ 请先启动 Hardhat 节点:"
    echo "   npx hardhat node"
    exit 1
fi

echo ""
echo "📦 部署合约..."
npx hardhat ignition deploy ignition/modules/FullDeploy.ts --network localhost

echo ""
echo "✅ 部署完成!"
echo ""
echo "📝 部署信息保存在: ignition/deployments/"
