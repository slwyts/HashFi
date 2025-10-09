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
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <div :class="[
                'w-10 h-10 rounded-full flex items-center justify-center mr-3',
                getRewardTypeColor(record.rewardType)
              ]">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-800">{{ t(getRewardTypeName(record.rewardType)) }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ record.formattedDate }}</p>
                <p v-if="record.fromUser !== '0x0000000000000000000000000000000000000000'" class="text-xs text-gray-400 mt-1">
                  {{ t('incomePage.from') }}: {{ formatAddress(record.fromUser) }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-green-600 text-lg">+{{ record.hafDisplay }} HAF</p>
              <p class="text-xs text-gray-500 mt-0.5">≈ ${{ record.usdtDisplay }}</p>
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
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount, useReadContract } from '@wagmi/vue';
import { formatUnits } from 'viem';
import abi from '../../contract/abi.json';
import { useToast } from '@/composables/useToast';
import { useEnhancedContract } from '@/composables/useEnhancedContract';

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// RewardType 枚举对应: 0=Static, 1=Direct, 2=Share, 3=Team
type RewardType = 0 | 1 | 2 | 3;

interface FormattedRewardRecord {
  timestamp: bigint;
  fromUser: string;
  rewardType: RewardType;
  usdtAmount: bigint;
  hafAmount: bigint;
  formattedDate: string;
  usdtDisplay: string;
  hafDisplay: string;
}

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
            refetchRecords(),
          ]);
        },
      }
    );
  } catch (error: any) {
    console.error('Withdraw error:', error);
    // 错误已经在 useEnhancedContract 中处理
  }
};

// ========== 3. 获取收益记录 ==========
const { data: rewardRecords, isLoading: isLoadingRecords, refetch: refetchRecords } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getRewardRecords',
  args: address ? [address] : undefined,
  query: {
    enabled: !!address,
  }
});

// 调试：查看原始数据
watch(() => rewardRecords.value, (newVal) => {
  console.log('Raw rewardRecords from contract:', newVal);
  console.log('Type:', typeof newVal);
  console.log('Is Array:', Array.isArray(newVal));
  if (Array.isArray(newVal)) {
    console.log('Length:', newVal.length);
    console.log('First item:', newVal[0]);
  }
}, { immediate: true });

// 格式化收益记录
const formattedRecords = computed<FormattedRewardRecord[]>(() => {
  if (!rewardRecords.value) return [];
  
  try {
    const records = rewardRecords.value as any[];
    
    // ✅ 第1层验证: 检查是否为有效数组
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }
    
    // ✅ 第2层: 映射并验证每条记录
    const mappedRecords = records.map((record: any) => {
      // 检查 record 是否有必需的字段
      if (!record || typeof record !== 'object') {
        console.warn('Invalid record structure:', record);
        return null;
      }
      
      // 检查每个字段是否存在
      if (record.timestamp === undefined || record.fromUser === undefined || 
          record.rewardType === undefined || record.usdtAmount === undefined || 
          record.hafAmount === undefined) {
        console.warn('Record has undefined fields:', record);
        return null;
      }
      
      const timestamp = record.timestamp as bigint;
      const date = new Date(Number(timestamp) * 1000);
      
      const formattedRecord = {
        timestamp,
        fromUser: record.fromUser as string,
        rewardType: record.rewardType as RewardType,
        usdtAmount: record.usdtAmount as bigint,
        hafAmount: record.hafAmount as bigint,
        formattedDate: date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        usdtDisplay: parseFloat(formatUnits(record.usdtAmount as bigint, 18)).toFixed(2), // ✅ USDT 是 18 位小数
        hafDisplay: parseFloat(formatUnits(record.hafAmount as bigint, 18)).toFixed(4),
      };
      
      return formattedRecord;
    });
    
    // ✅ 第3层: 过滤掉 null 值并按时间排序
    return mappedRecords
      .filter((record): record is FormattedRewardRecord => record !== null)
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  } catch (error) {
    console.error('Error formatting reward records:', error);
    return [];
  }
});

// ========== 4. 标签页筛选 ==========
const activeTab = ref<RewardType | 'all'>('all');

const tabs = [
  { key: 'all' as const, name: 'incomePage.tabs.all' },
  { key: 0 as const, name: 'incomePage.tabs.static' },
  { key: 1 as const, name: 'incomePage.tabs.direct' },
  { key: 2 as const, name: 'incomePage.tabs.share' },
  { key: 3 as const, name: 'incomePage.tabs.team' },
];

const filteredRecords = computed(() => {
  try {
    if (!formattedRecords.value || formattedRecords.value.length === 0) return [];
    
    if (activeTab.value === 'all') {
      return formattedRecords.value;
    }
    return formattedRecords.value.filter(record => record.rewardType === activeTab.value);
  } catch (error) {
    console.error('Error filtering records:', error);
    return [];
  }
});

// 计算重复记录数量
const duplicateRecordsCount = computed(() => {
  if (!formattedRecords.value) return 0;
  const duplicates = detectDuplicateRecords(formattedRecords.value);
  return duplicates.reduce((total, group) => total + (group.length - 1), 0);
});

// ========== 5. 辅助函数 ==========

// 获取重复记录数量
const getDuplicateCount = () => {
  if (!formattedRecords.value) return 0;
  const duplicates = detectDuplicateRecords(formattedRecords.value);
  return duplicates.reduce((total, group) => total + (group.length - 1), 0);
};

// 检查是否为可能的重复记录
const isDuplicateRecord = (record: FormattedRewardRecord, allRecords: FormattedRewardRecord[]) => {
  return allRecords.filter(r => 
    r.timestamp === record.timestamp && 
    r.rewardType === record.rewardType && 
    r.usdtDisplay === record.usdtDisplay
  ).length > 1;
};
// 检测可能的重复记录（简化版）
const detectDuplicateRecords = (records: FormattedRewardRecord[]) => {
  const groups: { [key: string]: FormattedRewardRecord[] } = {};
  
  records.forEach(record => {
    // 检查相同时间点和相同类型的记录
    const timeKey = Math.floor(Number(record.timestamp) / 60) * 60; // 按分钟分组
    const amountRange = Math.floor(parseFloat(record.usdtDisplay)); // 按整数金额分组
    const key = `${timeKey}_${record.rewardType}_${amountRange}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(record);
  });
  
  // 返回有多条记录的组
  return Object.values(groups).filter(group => group.length > 1);
};

const getRewardTypeName = (type: RewardType): string => {
  const typeMap: Record<RewardType, string> = {
    0: 'incomePage.types.static',
    1: 'incomePage.types.direct',
    2: 'incomePage.types.share',
    3: 'incomePage.types.team',
  };
  return typeMap[type] || 'incomePage.types.static';
};

const getRewardTypeColor = (type: RewardType): string => {
  const colorMap: Record<RewardType, string> = {
    0: 'bg-gradient-to-br from-blue-500 to-blue-600',      // 静态 - 蓝色
    1: 'bg-gradient-to-br from-green-500 to-green-600',    // 直推 - 绿色
    2: 'bg-gradient-to-br from-purple-500 to-purple-600',  // 分享 - 紫色
    3: 'bg-gradient-to-br from-orange-500 to-orange-600',  // 团队 - 橙色
  };
  return colorMap[type] || 'bg-gradient-to-br from-gray-500 to-gray-600';
};

const formatAddress = (addr: string): string => {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
</script>