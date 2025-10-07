<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen">
    <!-- 用户信息卡片 - 现代化蓝色渐变 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-b-3xl shadow-xl overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10 flex items-center">
        <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-white text-2xl mr-4 shadow-lg border-2 border-white/30">
          {{ address ? address.substring(2, 4).toUpperCase() : '??' }}
        </div>
        <div>
          <p class="font-bold text-lg font-mono text-white">{{ formattedAddress }}</p>
          <span v-if="userLevel" class="inline-block text-xs bg-yellow-400 text-yellow-900 font-semibold py-1 px-3 rounded-full mt-1 shadow-md">{{ t(userLevel) }}</span>
        </div>
      </div>
    </div>

    <div class="p-4">
      <!-- 资产卡片 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg text-center border border-gray-100 -mt-6 relative z-10">
        <p class="text-sm text-gray-500 mb-1">{{ t('profilePage.totalAssets') }} (HAF)</p>
        <p class="text-5xl font-bold my-3 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          {{ totalHafBalance }}
        </p>
        <p class="text-sm text-gray-400 mb-5">≈ ${{ totalUsdValue }}</p>
        <div class="mt-4">
          <button 
            @click="router.push('/income')"
            class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
          >
            {{ t('profilePage.viewIncome') }}
          </button>
        </div>
      </div>
    </div>

    <div class="px-4 space-y-4">
      <!-- 功能区 1 -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <ul class="divide-y divide-gray-100">
          <li @click="router.push('/genesis-node')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <img src="/icons/ecosystem.svg" class="w-5 h-5 brightness-0 invert" alt="node icon">
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.applyNode') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li @click="showBindReferrerModal = true" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <img src="/icons/link.svg" class="w-5 h-5 brightness-0 invert" alt="link icon">
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.bindReferrer') }}</span>
            </div>
             <div class="flex items-center">
                <span class="text-sm text-gray-500 mr-2 font-mono">{{ referrerDisplay }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- 管理员入口 (仅管理员可见) -->
      <div v-if="isAdmin" class="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg overflow-hidden">
        <div @click="router.push('/admin')" class="p-4 flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity group">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="font-bold text-white">{{ t('profilePage.adminPanel') }}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>

      <!-- 功能区 2 - 帮助与关于 -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <ul class="divide-y divide-gray-100">
           <li @click="showInfo('helpCenter')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.helpCenter') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
           <li @click="showInfo('aboutUs')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.aboutUs') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
        </ul>
      </div>
    </div>

    <!-- 断开连接按钮 -->
    <div class="p-4 mt-4 mb-20">
        <button class="w-full bg-white text-red-500 font-bold py-3 rounded-2xl shadow-md hover:bg-red-50 transition-colors border border-red-200 hover:border-red-300">
          {{ t('profilePage.disconnect') }}
        </button>
    </div>

    <!-- 绑定推荐人模态框 -->
    <BindReferrerModal
      :visible="showBindReferrerModal"
      :owner-address="ownerAddress as string"
      :current-referrer="userInfo ? (userInfo as any[])[0] : undefined"
      @close="showBindReferrerModal = false"
      @success="handleBindSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount, useReadContract, useBalance } from '@wagmi/vue';
import { formatEther, formatUnits } from 'viem';
import abi from '../../contract/abi.json';
import BindReferrerModal from '@/components/BindReferrerModal.vue';

const { t } = useI18n();
const router = useRouter();
const { address } = useAccount();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const HAF_TOKEN_ADDRESS = CONTRACT_ADDRESS; // HAF 代币就是合约本身

// 读取合约 owner
const { data: ownerAddress } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'owner',
});

// 判断是否是管理员
const isAdmin = computed(() => {
  return address.value && ownerAddress.value && 
         address.value.toLowerCase() === (ownerAddress.value as string).toLowerCase();
});

// 读取用户信息
const { data: userInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: address.value ? [address.value] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 读取 HAF 余额
const { data: hafBalance } = useBalance({
  address: address.value,
  token: HAF_TOKEN_ADDRESS,
  query: {
    enabled: !!address.value,
  },
});

// 读取 HAF 价格
const { data: hafPriceData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
});

// 读取可提取收益
const { data: claimableData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getClaimableRewards',
  args: address.value ? [address.value] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 计算总 HAF 资产（余额 + 可提取收益）
const totalHafBalance = computed(() => {
  if (!address.value) return '0.00';
  
  const balance = hafBalance.value ? Number(formatEther(hafBalance.value.value)) : 0;
  const claimable = claimableData.value ? Number(formatEther((claimableData.value as any).totalClaimableHaf || 0n)) : 0;
  
  return (balance + claimable).toFixed(2);
});

// 计算美元价值
const totalUsdValue = computed(() => {
  if (!hafPriceData.value) return '0.00';
  
  const hafAmount = parseFloat(totalHafBalance.value);
  const hafPrice = Number(formatUnits(hafPriceData.value as bigint, 6));
  
  return (hafAmount * hafPrice).toFixed(2);
});

// 格式化地址
const formattedAddress = computed(() => {
  if (!address.value) return t('profilePage.notConnected');
  return `${address.value.substring(0, 6)}...${address.value.substring(address.value.length - 4)}`;
});

// 用户等级
const userLevel = computed(() => {
  if (!userInfo.value) return '';
  
  // userInfo 是数组: [referrer, teamLevel, totalStakedAmount, ...]
  const info = userInfo.value as any[];
  const totalInvested = Number(formatEther(info[2] || 0n)); // index 2 是 totalStakedAmount
  
  // 根据投资金额判断等级
  if (totalInvested >= 50000) return 'stakingPage.diamond';
  if (totalInvested >= 10000) return 'stakingPage.gold';
  if (totalInvested >= 1000) return 'stakingPage.silver';
  return 'stakingPage.bronze';
});

// 推荐人显示
const referrerDisplay = computed(() => {
  if (!userInfo.value) return t('profilePage.notBound');
  
  const info = userInfo.value as any;
  const referrer = (info[0] || info.referrer) as string;
  
  // 检查是否为零地址
  if (!referrer || 
      referrer === '0x0000000000000000000000000000000000000000' ||
      referrer === '0x0') {
    return t('profilePage.notBound');
  }
  
  // 返回缩短的地址
  return `${referrer.substring(0, 6)}...${referrer.substring(referrer.length - 4)}`;
});

// 绑定推荐人模态框
const showBindReferrerModal = ref(false);

// 绑定成功回调
const handleBindSuccess = () => {
  // 重新获取用户信息
  window.location.reload();
};

// Modal 控制逻辑（保留用于其他用途）
const isModalVisible = ref(false);
const modalTitle = ref('');
const modalContent = ref('');

// 使用通用内容页面显示详细信息
const showInfo = (type: 'helpCenter' | 'aboutUs') => {
  const contentMap = {
    helpCenter: {
      title: t('profilePage.helpCenter'),
      type: 'markdown',
      content: `
# 帮助中心

欢迎来到 HashFi 帮助中心！以下是常见问题解答。

## 常见问题

### 1. 如何开始使用 HashFi？

**步骤一：连接钱包**
- 点击页面顶部的"连接钱包"按钮
- 选择您使用的钱包（如 MetaMask、WalletConnect 等）
- 授权连接

**步骤二：准备资金**
- 确保钱包中有足够的 USDT 或 HAF 代币
- 如果没有，可以通过闪兑功能兑换

**步骤三：开始质押**
- 前往"质押"页面
- 选择合适的质押方案
- 输入质押数量并确认

### 2. 质押相关问题

**Q: 最低质押金额是多少？**
A: 不同等级的质押方案有不同的最低金额要求，一般从 100 USDT 起。

**Q: 质押后何时开始获得收益？**
A: 质押成功后立即开始计算收益，每日 00:00 UTC 结算并发放。

**Q: 可以提前赎回吗？**
A: 质押期间可以随时赎回，但可能会损失部分收益。建议完成完整周期。

**Q: 收益如何计算？**
A: 收益 = 质押金额 × 日收益率 × 天数。具体收益率根据您选择的方案而定。

### 3. 闪兑功能

**Q: 闪兑手续费是多少？**
A: 闪兑手续费根据交易对和金额动态调整，一般在 0.3% - 1% 之间。

**Q: 闪兑有最低金额限制吗？**
A: 是的，最低闪兑金额为 10 USDT。

**Q: 闪兑需要多长时间？**
A: 通常在 1-3 分钟内完成，具体取决于区块链网络状况。

### 4. 团队与推荐

**Q: 如何邀请好友？**
A: 在"团队"页面可以找到您的专属邀请链接，分享给好友即可。

**Q: 推荐奖励如何发放？**
A: 当您推荐的用户完成质押后，奖励会自动发放到您的账户。

**Q: 推荐有层级限制吗？**
A: 支持多级推荐，具体规则请查看团队页面的详细说明。

### 5. 安全相关

**Q: 我的资产安全吗？**
A: 您的资产由智能合约托管，经过专业安全审计，同时我们采用多重签名等安全措施。

**Q: 如何保护我的钱包安全？**
- 妥善保管助记词和私钥
- 不要在不安全的网站连接钱包
- 定期检查授权的 DApp
- 使用硬件钱包提高安全性

**Q: 忘记密码怎么办？**
A: HashFi 是去中心化应用，我们不存储您的密码。请通过钱包的助记词或私钥恢复访问。

### 6. 提现相关

**Q: 如何提现？**
A: 在"我的"页面点击"提现"按钮，输入金额并确认即可。

**Q: 提现需要多长时间？**
A: 一般在 5-30 分钟内到账，具体取决于区块链网络拥堵情况。

**Q: 提现有手续费吗？**
A: 需要支付少量的区块链网络 Gas 费用。

## 联系我们

如果您还有其他问题，请通过以下方式联系我们：

- 📧 邮箱：support@hashfi.io
- 💬 Telegram：@HashFi_Official
- 🐦 Twitter：@HashFi_DeFi

我们的客服团队会在 24 小时内回复您的问题。
      `
    },
    aboutUs: {
      title: t('profilePage.aboutUs'),
      type: 'markdown',
      content: `
# 关于我们

## HashFi 简介

HashFi 是一个创新的去中心化金融（DeFi）平台，致力于为用户提供安全、高效、透明的数字资产管理服务。

### 我们的愿景

打造新一代去中心化金融基础设施，让每个人都能轻松享受区块链技术带来的金融创新。

### 我们的使命

- **安全第一**：采用业界领先的安全标准，保护用户资产
- **用户至上**：提供简单易用的产品体验
- **创新驱动**：持续探索 DeFi 领域的新可能
- **透明公开**：所有数据和操作在链上可查

## 核心产品

### 1. 智能质押
基于智能合约的质押服务，让您的资产获得稳定收益。

**特点：**
- 多种质押方案可选
- 灵活的质押期限
- 每日自动结算收益
- 透明的收益计算

### 2. 闪电兑换
快速、低成本的代币兑换服务。

**特点：**
- 即时兑换，无需等待
- 优惠的兑换汇率
- 支持主流代币
- 自动最优路径

### 3. 团队激励
完善的推荐奖励机制，与好友共同成长。

**特点：**
- 多级推荐奖励
- 实时奖励发放
- 团队业绩可视化
- 公平透明的分配

## 技术优势

### 🔒 安全性
- 智能合约经过多家知名机构审计
- 采用多重签名和时间锁机制
- 定期进行安全漏洞扫描
- 资金隔离存储

### ⚡ 高性能
- 基于高性能区块链网络
- 优化的智能合约设计
- 快速的交易确认
- 低廉的手续费

### 🌐 去中心化
- 非托管式资产管理
- 社区治理机制
- 开源透明的代码
- 抗审查能力

### 📱 易用性
- 友好的用户界面
- 完善的新手引导
- 多语言支持
- 全平台覆盖

## 团队介绍

HashFi 团队由来自全球顶尖科技公司和金融机构的专业人士组成：

- **区块链开发专家**：拥有丰富的智能合约和 DApp 开发经验
- **金融产品经理**：深谙传统金融和 DeFi 产品设计
- **安全审计工程师**：确保平台和用户资产安全
- **运营与市场团队**：为用户提供优质服务和支持

## 发展历程

**2024 Q3** - 项目启动，完成核心团队组建

**2024 Q4** - 智能合约开发完成，通过安全审计

**2025 Q1** - 测试网上线，开启公测

**2025 Q2** - 主网正式上线，质押功能发布

**2025 Q3** - 闪兑功能上线，用户突破 10,000

**未来规划** - 持续迭代产品，拓展更多 DeFi 功能

## 合作伙伴

我们与多家知名机构建立了战略合作关系：

- 🏦 顶级区块链技术服务商
- 🔐 专业安全审计机构
- 💱 主流 DEX 和流动性提供商
- 📊 数据分析和市场研究机构

## 社区

加入 HashFi 全球社区，与我们一起成长：

- **Telegram**：@HashFi_Official
- **Twitter**：@HashFi_DeFi
- **Discord**：discord.gg/hashfi
- **Medium**：medium.com/@hashfi

## 联系方式

**商务合作**：business@hashfi.io

**技术支持**：support@hashfi.io

**媒体咨询**：media@hashfi.io

---

*HashFi - 让 DeFi 更简单、更安全、更高效*
      `
    }
  };

  const data = contentMap[type];
  router.push({
    path: '/content',
    query: {
      title: data.title,
      type: data.type,
      content: data.content
    }
  });
};

</script>