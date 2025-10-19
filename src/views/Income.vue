<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-20">
    <!-- 顶部收益卡片 - 现代化蓝色渐变 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-b-3xl shadow-xl mb-6 overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <p class="text-sm opacity-90 mb-2">{{ t('incomePage.totalClaimable') }} (HAF)</p>
        <p v-if="isLoadingRewards" class="text-4xl font-bold mb-8 tracking-tight animate-pulse">
          {{ t('common.loading') }}...
        </p>
        <p v-else class="text-5xl font-bold mb-8 tracking-tight">{{ totalClaimableDisplay }}</p>
        
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">{{ pendingStaticDisplay }}</p>
            <p class="text-xs opacity-90">{{ t('incomePage.staticReward') }}</p>
          </div>
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">{{ pendingDynamicDisplay }}</p>
            <p class="text-xs opacity-90">{{ t('incomePage.dynamicReward') }}</p>
          </div>
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">{{ pendingGenesisDisplay }}</p>
            <p class="text-xs opacity-90">{{ t('incomePage.genesisReward') }}</p>
          </div>
        </div>

        <!-- 提现按钮 -->
                <button
          @click="handleWithdraw"
          :disabled="isProcessing() || !canWithdraw"
          class="w-full mt-6 py-3.5 rounded-xl font-bold transition-all duration-200"
          :class="{
            'bg-white text-blue-600 hover:bg-blue-50 active:scale-95':
            canWithdraw && !isProcessing(),
            'bg-white/30 text-white/50 cursor-not-allowed': !canWithdraw || isProcessing()
          }"
        >
          <span v-if="isProcessing()">{{ t('common.processing') }}...</span>
          <span v-else-if="!canWithdraw">{{ t('incomePage.noClaimable') }}</span>
          <span v-else>{{ t('incomePage.withdraw') }}</span>
        </button>
      </div>
    </div>

    <div class="px-4">
      <h3 class="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
        {{ t('incomePage.incomeRecords') }}
      </h3>
      
      <!-- 现代化标签页 -->
      <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'flex-1 py-2.5 text-center font-semibold transition-all duration-200 rounded-lg text-sm',
            activeTab === tab.key 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ t(tab.name) }}
        </button>
      </div>

      <!-- Loading 状态 -->
      <div v-if="isLoadingRecords" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-gray-400 mt-4">{{ t('common.loading') }}...</p>
      </div>

      <!-- 收益记录列表 -->
      <div v-else class="space-y-3 pb-6">
        <div 
          v-for="(record, index) in filteredRecords" 
          :key="index" 
          class="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
        >
          <div class="flex justify-between items-start">
            <div class="flex items-start flex-1">
              <div :class="[
                'w-12 h-12 rounded-xl flex items-center justify-center mr-3 flex-shrink-0',
                getRewardTypeColor(record.rewardType)
              ]">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <!-- 收益类型标题 -->
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-gray-800 text-base">{{ t(getRewardTypeName(record.rewardType)) }}</span>
                  <span :class="[
                    'text-xs px-2 py-0.5 rounded-full',
                    getRewardTypeBadge(record.rewardType)
                  ]">
                    {{ t(getRewardTypeLabel(record.rewardType)) }}
                  </span>
                </div>
                
                <!-- 时间 -->
                <p class="text-xs text-gray-500 mb-1">
                  <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ record.formattedDate }}
                </p>
                
                <!-- 来源信息 -->
                <p v-if="record.fromUser !== '0x0000000000000000000000000000000000000000'" class="text-xs text-gray-400 flex items-center">
                  <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ t('incomePage.from') }}: {{ formatAddress(record.fromUser) }}
                </p>
              </div>
            </div>
            
            <!-- 金额显示 -->
            <div class="text-right ml-4">
              <p class="font-bold text-green-600 text-lg whitespace-nowrap">
                +{{ parseFloat(record.hafAmount).toFixed(4) }} HAF
              </p>
              <p class="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                ≈ ${{ parseFloat(record.usdtAmount).toFixed(2) }}
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="!filteredRecords || filteredRecords.length === 0" class="text-center py-10">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24 opacity-50" />
          <p class="text-gray-400 mt-2">{{ t('stakingPage.noData') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount, useReadContract } from '@wagmi/vue';
import { formatUnits } from 'viem';
import { abi } from '@/core/contract';
import { useToast } from '@/composables/useToast';
import { useEnhancedContract } from '@/composables/useEnhancedContract';
import { useRewardEvents, type RewardType } from '@/composables/useRewardEvents';

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// ========== 1. 获取待领取收益 ==========
const { data: claimableRewards, isLoading: isLoadingRewards, refetch: refetchRewards } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getClaimableRewards',
  args: address ? [address] : undefined,
  query: {
    enabled: !!address,
  }
});

// 待领取收益显示
const pendingStaticDisplay = computed(() => {
  if (!claimableRewards.value) return '0.00';
  try {
    const rewards = claimableRewards.value as readonly [bigint, bigint, bigint];
    if (!rewards || !Array.isArray(rewards) || rewards.length < 3) return '0.00';
    const value = formatUnits(rewards[0], 18);
    return parseFloat(value).toFixed(2);
  } catch (error) {
    console.error('Error calculating pendingStatic:', error);
    return '0.00';
  }
});

const pendingDynamicDisplay = computed(() => {
  if (!claimableRewards.value) return '0.00';
  try {
    const rewards = claimableRewards.value as readonly [bigint, bigint, bigint];
    if (!rewards || !Array.isArray(rewards) || rewards.length < 3) return '0.00';
    const value = formatUnits(rewards[1], 18);
    return parseFloat(value).toFixed(2);
  } catch (error) {
    console.error('Error calculating pendingDynamic:', error);
    return '0.00';
  }
});

const pendingGenesisDisplay = computed(() => {
  if (!claimableRewards.value) return '0.00';
  try {
    const rewards = claimableRewards.value as readonly [bigint, bigint, bigint];
    if (!rewards || !Array.isArray(rewards) || rewards.length < 3) return '0.00';
    const value = formatUnits(rewards[2], 18);
    return parseFloat(value).toFixed(2);
  } catch (error) {
    console.error('Error calculating pendingGenesis:', error);
    return '0.00';
  }
});

const totalClaimableDisplay = computed(() => {
  if (!claimableRewards.value) return '0.00';
  try {
    const rewards = claimableRewards.value as readonly [bigint, bigint, bigint];
    if (!rewards || !Array.isArray(rewards) || rewards.length < 3) return '0.00';
    const total = rewards[0] + rewards[1] + rewards[2];
    const value = formatUnits(total, 18);
    return parseFloat(value).toFixed(2);
  } catch (error) {
    console.error('Error calculating totalClaimable:', error);
    return '0.00';
  }
});

const canWithdraw = computed(() => {
  if (!claimableRewards.value) return false;
  try {
    const rewards = claimableRewards.value as readonly [bigint, bigint, bigint];
    if (!rewards || !Array.isArray(rewards) || rewards.length < 3) return false;
    const total = rewards[0] + rewards[1] + rewards[2];
    return total > 0n;
  } catch (error) {
    console.error('Error checking canWithdraw:', error);
    return false;
  }
});

// ========== 2. 提现功能 ==========
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const handleWithdraw = async () => {
  if (!address || !canWithdraw.value) return;

  try {
    await callContractWithRefresh(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'withdraw',
        pendingMessage: t('incomePage.withdrawing'),
        successMessage: t('incomePage.withdrawSuccess'),
        operation: 'Withdraw Income',
      },
      {
        refreshBalance: async () => {
          // 刷新所有相关数据
          await Promise.all([
            refetchRewards(),
            fetchRewardEvents(),
          ]);
        },
      }
    );
  } catch (error: any) {
    console.error('Withdraw error:', error);
    // 错误已经在 useEnhancedContract 中处理
  }
};

// ========== 3. 使用事件监听获取收益记录 ==========
const {
  rewardEvents,
  isLoading: isLoadingRecords,
  getEventsByType,
  fetchRewardEvents,
} = useRewardEvents();

// ========== 4. 标签页筛选 ==========
// 简化为3个标签：全部、静态、动态、创世节点
const activeTab = ref<'all' | 'static' | 'dynamic' | 'genesis'>('all');

const tabs = [
  { key: 'all' as const, name: 'incomePage.tabs.all' },
  { key: 'static' as const, name: 'incomePage.tabs.static' },
  { key: 'dynamic' as const, name: 'incomePage.tabs.dynamic' },
  { key: 'genesis' as const, name: 'incomePage.tabs.genesis' },
];

const filteredRecords = computed(() => {
  if (activeTab.value === 'all') {
    return rewardEvents.value;
  } else if (activeTab.value === 'static') {
    // 静态 = Static(0) + Team(3)
    return rewardEvents.value.filter((e: any) => e.rewardType === 0 || e.rewardType === 3);
  } else if (activeTab.value === 'dynamic') {
    // 动态 = Direct(1) + Share(2)
    return rewardEvents.value.filter((e: any) => e.rewardType === 1 || e.rewardType === 2);
  } else if (activeTab.value === 'genesis') {
    // 创世节点 = Genesis(4)
    return rewardEvents.value.filter((e: any) => e.rewardType === 4);
  }
  return rewardEvents.value;
});

// ========== 5. 辅助函数 ==========

const getRewardTypeName = (type: RewardType): string => {
  const typeMap: Record<RewardType, string> = {
    0: 'incomePage.types.static',       // 静态收益
    1: 'incomePage.types.dynamic',      // 动态收益（直推）
    2: 'incomePage.types.dynamic',      // 动态收益（分享）
    3: 'incomePage.types.staticBonus',  // 静态加速
    4: 'incomePage.types.genesis',      // 创世节点
  };
  return typeMap[type] || 'incomePage.types.static';
};

const getRewardTypeColor = (type: RewardType): string => {
  const colorMap: Record<RewardType, string> = {
    0: 'bg-gradient-to-br from-blue-500 to-blue-600',      // 静态 - 蓝色
    1: 'bg-gradient-to-br from-green-500 to-green-600',    // 动态 - 绿色
    2: 'bg-gradient-to-br from-green-500 to-green-600',    // 动态 - 绿色（和直推一样）
    3: 'bg-gradient-to-br from-purple-500 to-purple-600',  // 静态加速 - 紫色
    4: 'bg-gradient-to-br from-yellow-500 to-yellow-600',  // 创世节点 - 金色
  };
  return colorMap[type] || 'bg-gradient-to-br from-gray-500 to-gray-600';
};

// 获取收益类型的小标签文字
const getRewardTypeLabel = (type: RewardType): string => {
  const labelMap: Record<RewardType, string> = {
    0: 'incomePage.labels.dailyRelease',    // 每日释放
    1: 'incomePage.labels.referralReward',  // 推荐奖励
    2: 'incomePage.labels.teamShare',       // 团队分成
    3: 'incomePage.labels.bonusReward',     // 加速奖励
    4: 'incomePage.labels.nodeDividend',    // 节点分红
  };
  return labelMap[type] || 'incomePage.labels.dailyRelease';
};

// 获取收益类型标签的颜色样式
const getRewardTypeBadge = (type: RewardType): string => {
  const badgeMap: Record<RewardType, string> = {
    0: 'bg-blue-100 text-blue-700',      // 静态 - 蓝色徽章
    1: 'bg-green-100 text-green-700',    // 动态 - 绿色徽章
    2: 'bg-green-100 text-green-700',    // 动态 - 绿色徽章
    3: 'bg-purple-100 text-purple-700',  // 静态加速 - 紫色徽章
    4: 'bg-yellow-100 text-yellow-700',  // 创世节点 - 金色徽章
  };
  return badgeMap[type] || 'bg-gray-100 text-gray-700';
};

const formatAddress = (addr: string): string => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
</script>