<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        {{ t('admin.title') }}
      </h1>
      <p class="text-gray-500 mt-2">{{ t('admin.subtitle') }}</p>
    </div>

    <!-- 权限检查 -->
    <div v-if="!isAdmin" class="card p-8 text-center">
      <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">{{ t('admin.noAccess') }}</h2>
      <p class="text-gray-600">{{ t('admin.adminOnly') }}</p>
    </div>

    <!-- 管理员面板 -->
    <div v-else class="space-y-6">
      <!-- Tab 导航 -->
      <div class="flex bg-white rounded-xl p-2 shadow-sm overflow-x-auto gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key as TabType"
          :class="[
            'flex-1 min-w-[100px] py-3 px-4 rounded-lg font-semibold transition-all duration-200',
            activeTab === tab.key
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          ]"
        >
          {{ t(tab.name) }}
        </button>
      </div>

      <!-- 创世节点审核 -->
      <div v-if="activeTab === 'genesis'" class="card p-6">
        <h2 class="text-xl font-bold mb-4">{{ t('admin.genesisApprovals') }}</h2>
        
        <div v-if="pendingApplications.length === 0" class="text-center py-10">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24" />
          <p class="text-gray-400 mt-2">{{ t('admin.noPendingApplications') }}</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="applicant in pendingApplications"
            :key="applicant"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div>
              <p class="font-mono text-sm text-gray-800">{{ applicant }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ t('admin.applicationFee') }}: 5000 USDT</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="approveNode(applicant)"
                :disabled="isProcessing"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {{ t('admin.approve') }}
              </button>
              <button
                @click="rejectNode(applicant)"
                :disabled="isProcessing"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ t('admin.reject') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 活跃节点列表 -->
        <div class="mt-8">
          <h3 class="text-lg font-bold mb-4">{{ t('admin.activeNodes') }}</h3>
          <div class="grid gap-3">
            <div
              v-for="node in activeNodes"
              :key="node"
              class="p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <p class="font-mono text-sm text-green-800">{{ node }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- BTC数据管理 -->
      <div v-if="activeTab === 'btc'" class="card p-6">
        <h2 class="text-xl font-bold mb-4">{{ t('admin.btcManagement') }}</h2>
        
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.totalHashrate') }}
            </label>
            <input
              v-model="btcForm.totalHashrate"
              type="number"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100000"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.globalHashrate') }}
            </label>
            <input
              v-model="btcForm.globalHashrate"
              type="number"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="500000000"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.btcPrice') }} (USD)
            </label>
            <input
              v-model="btcForm.btcPrice"
              type="number"
              step="0.01"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="95000"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.dailyRewardPerT') }}
            </label>
            <input
              v-model="btcForm.dailyRewardPerT"
              type="number"
              step="0.0000001"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00001"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.currentDifficulty') }}
            </label>
            <input
              v-model="btcForm.currentDifficulty"
              type="number"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="70000000000000"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.yesterdayMined') }} (BTC)
            </label>
            <input
              v-model="btcForm.yesterdayMined"
              type="number"
              step="0.00000001"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.5"
            />
          </div>
        </div>

        <div class="flex gap-4 mt-6">
          <button
            @click="updateBtcData"
            :disabled="isProcessing"
            class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            {{ t('admin.updateBtcData') }}
          </button>
        </div>
      </div>

      <!-- HAF价格管理 -->
      <div v-if="activeTab === 'price'" class="card p-6">
        <h2 class="text-xl font-bold mb-4">{{ t('admin.priceManagement') }}</h2>
        
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-800">{{ t('admin.currentHafPrice') }}</p>
              <p class="text-3xl font-bold text-blue-600 mt-1">{{ currentHafPrice }} USDT</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-blue-800">{{ t('admin.dailyIncrease') }}</p>
              <p class="text-2xl font-bold text-blue-600 mt-1">{{ dailyIncreaseRate }}‰</p>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.setNewPrice') }} (USDT)
            </label>
            <input
              v-model="priceForm.newPrice"
              type="number"
              step="0.000001"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :placeholder="currentHafPrice"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.dailyIncreaseRate') }} (‰)
            </label>
            <input
              v-model="priceForm.dailyRate"
              type="number"
              step="0.1"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
            />
          </div>
        </div>

        <div class="flex gap-4 mt-6">
          <button
            @click="updatePrice"
            :disabled="isProcessing"
            class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            {{ t('admin.updatePrice') }}
          </button>
          <button
            @click="triggerPriceUpdate"
            :disabled="isProcessing"
            class="flex-1 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 disabled:opacity-50 transition-all"
          >
            {{ t('admin.triggerUpdate') }}
          </button>
        </div>
      </div>

      <!-- 统计数据 -->
      <div v-if="activeTab === 'stats'" class="space-y-4">
        <h2 class="text-xl font-bold">{{ t('admin.globalStatistics') }}</h2>
        
        <div class="grid md:grid-cols-3 gap-4">
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.totalDeposited') }}</p>
            <p class="text-2xl font-bold text-blue-600 mt-2">{{ stats.totalDeposited }} USDT</p>
          </div>
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.totalWithdrawn') }}</p>
            <p class="text-2xl font-bold text-green-600 mt-2">{{ stats.totalWithdrawn }} HAF</p>
          </div>
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.totalFee') }}</p>
            <p class="text-2xl font-bold text-purple-600 mt-2">{{ stats.totalFee }} HAF</p>
          </div>
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.activeUsers') }}</p>
            <p class="text-2xl font-bold text-indigo-600 mt-2">{{ stats.activeUsers }}</p>
          </div>
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.totalOrders') }}</p>
            <p class="text-2xl font-bold text-pink-600 mt-2">{{ stats.totalOrders }}</p>
          </div>
          <div class="card p-4">
            <p class="text-sm text-gray-600">{{ t('admin.completedOrders') }}</p>
            <p class="text-2xl font-bold text-orange-600 mt-2">{{ stats.completedOrders }}</p>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-bold mb-4">{{ t('admin.contractBalance') }}</h3>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <p class="text-sm opacity-90">USDT {{ t('admin.balance') }}</p>
              <p class="text-3xl font-bold mt-2">{{ stats.usdtBalance }}</p>
            </div>
            <div class="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
              <p class="text-sm opacity-90">HAF {{ t('admin.balance') }}</p>
              <p class="text-3xl font-bold mt-2">{{ stats.hafBalance }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统设置 -->
      <div v-if="activeTab === 'settings'" class="space-y-6">
        <h2 class="text-xl font-bold">{{ t('admin.systemSettings') }}</h2>
        
        <!-- 费率设置 -->
        <div class="card p-6">
          <h3 class="text-lg font-bold mb-4">{{ t('admin.feeSettings') }}</h3>
          
          <div class="grid md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('admin.withdrawalFee') }} (%)
              </label>
              <input
                v-model="settingsForm.withdrawalFee"
                type="number"
                step="0.1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('admin.swapFee') }} (%)
              </label>
              <input
                v-model="settingsForm.swapFee"
                type="number"
                step="0.1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="3"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('admin.genesisNodeCost') }} (USDT)
              </label>
              <input
                v-model="settingsForm.genesisNodeCost"
                type="number"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5000"
              />
            </div>
          </div>

          <button
            @click="updateFeeSettings"
            :disabled="isProcessing"
            class="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {{ t('admin.updateSettings') }}
          </button>
        </div>

        <!-- 价格自动更新开关 -->
        <div class="card p-6">
          <h3 class="text-lg font-bold mb-4">{{ t('admin.autoPriceUpdate') }}</h3>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-700">{{ t('admin.enableAutoPriceUpdate') }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ t('admin.autoPriceUpdateDesc') }}</p>
            </div>
            <button
              @click="toggleAutoPriceUpdate"
              :disabled="isProcessing"
              :class="[
                'px-6 py-2 rounded-lg font-semibold transition-all',
                autoPriceUpdateEnabled.data?.value
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              ]"
            >
              {{ autoPriceUpdateEnabled.data?.value ? t('common.enabled') : t('common.disabled') }}
            </button>
          </div>
        </div>

        <!-- 高级操作 -->
        <div class="card p-6">
          <h3 class="text-lg font-bold mb-4 text-red-600">{{ t('admin.advancedOperations') }}</h3>
          
          <!-- 强制结算用户 -->
          <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.forceSettleUser') }}
            </label>
            <div class="flex gap-2">
              <input
                v-model="advancedForm.settleUserAddress"
                type="text"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                placeholder="0x..."
              />
              <button
                @click="forceSettleUser"
                :disabled="isProcessing"
                class="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {{ t('admin.execute') }}
              </button>
            </div>
          </div>

          <!-- 设置用户团队等级 -->
          <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ t('admin.setUserTeamLevel') }}
            </label>
            <div class="flex gap-2">
              <input
                v-model="advancedForm.teamLevelAddress"
                type="text"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0x..."
              />
              <input
                v-model.number="advancedForm.teamLevel"
                type="number"
                min="0"
                max="5"
                class="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="1-5"
              />
              <button
                @click="setUserTeamLevel"
                :disabled="isProcessing"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ t('admin.execute') }}
              </button>
            </div>
          </div>

          <!-- 紧急提现 -->
          <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <label class="block text-sm font-medium text-red-700 mb-2">
              {{ t('admin.emergencyWithdraw') }}
            </label>
            <div class="flex gap-2">
              <select
                v-model="advancedForm.withdrawToken"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="USDT">USDT</option>
                <option value="HAF">HAF</option>
              </select>
              <input
                v-model="advancedForm.withdrawAmount"
                type="number"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Amount"
              />
              <button
                @click="emergencyWithdraw"
                :disabled="isProcessing"
                class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {{ t('admin.withdraw') }}
              </button>
            </div>
          </div>

          <!-- 暂停/恢复合约 -->
          <div class="flex gap-4">
            <button
              @click="pauseContract"
              :disabled="isProcessing"
              class="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {{ t('admin.pauseContract') }}
            </button>
            <button
              @click="unpauseContract"
              :disabled="isProcessing"
              class="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {{ t('admin.unpauseContract') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount, useReadContract, useWriteContract } from '@wagmi/vue';
import { parseEther, parseUnits, formatEther, formatUnits } from 'viem';
import abi from '../../contract/abi.json';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// 类型定义
type TabType = 'genesis' | 'btc' | 'price' | 'stats' | 'settings';

// Tab状态
const activeTab = ref<TabType>('genesis');
const tabs = [
  { key: 'genesis', name: 'admin.tabs.genesis' },
  { key: 'btc', name: 'admin.tabs.btc' },
  { key: 'price', name: 'admin.tabs.price' },
  { key: 'stats', name: 'admin.tabs.stats' },
  { key: 'settings', name: 'admin.tabs.settings' },
];

// 处理状态
const isProcessing = ref(false);

// 表单数据
const btcForm = ref({
  totalHashrate: '',
  globalHashrate: '',
  btcPrice: '',
  dailyRewardPerT: '',
  currentDifficulty: '',
  yesterdayMined: '',
});

const priceForm = ref({
  newPrice: '',
  dailyRate: '',
});

const settingsForm = ref({
  withdrawalFee: '',
  swapFee: '',
  genesisNodeCost: '',
});

const advancedForm = ref({
  settleUserAddress: '',
  teamLevelAddress: '',
  teamLevel: 1,
  withdrawToken: 'USDT',
  withdrawAmount: '',
});

// 读取合约数据
const { data: ownerAddress } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'owner',
});

const { data: pendingApps, refetch: refetchPending, error: pendingError } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getPendingGenesisApplications',
  account: address, // ✅ 指定调用账户
  query: {
    enabled: !!address.value, // ✅ 添加 enabled 条件
  }
});

// 🔍 调试日志
watch(() => pendingApps.value, (newVal) => {
  console.log('===== Admin pendingApps Debug =====');
  console.log('pendingApps.value:', newVal);
  console.log('Type:', typeof newVal);
  console.log('Is Array:', Array.isArray(newVal));
  if (Array.isArray(newVal)) {
    console.log('Length:', newVal.length);
    console.log('Items:', newVal);
  }
  console.log('==================================');
}, { immediate: true });

// 🔍 调试错误
watch(() => pendingError.value, (error) => {
  if (error) {
    console.error('===== pendingApps Error =====');
    console.error('Error:', error);
    console.error('============================');
  }
}, { immediate: true });

const { data: activeNodesData, refetch: refetchActive } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getActiveGenesisNodes',
});

const { data: hafPriceData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
});

const { data: dailyRateData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'dailyPriceIncreaseRate',
});

const autoPriceUpdateEnabled = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'autoPriceUpdateEnabled',
});

const { data: globalStatsData, refetch: refetchStats } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getGlobalStats',
});

// 计算属性
const isAdmin = computed(() => {
  return address.value && ownerAddress.value && 
         address.value.toLowerCase() === (ownerAddress.value as string).toLowerCase();
});

// 🔍 调试 isAdmin（必须放在 isAdmin 定义之后）
watch(() => isAdmin.value, (newVal) => {
  console.log('===== isAdmin Debug =====');
  console.log('isAdmin:', newVal);
  console.log('address:', address.value);
  console.log('ownerAddress:', ownerAddress.value);
  console.log('========================');
}, { immediate: true });

const pendingApplications = computed(() => (pendingApps.value as string[]) || []);
const activeNodes = computed(() => (activeNodesData.value as string[]) || []);

const currentHafPrice = computed(() => {
  if (!hafPriceData.value) return '1.000000';
  return formatUnits(hafPriceData.value as bigint, 18); // ✅ 18 位精度
});

const dailyIncreaseRate = computed(() => {
  if (!dailyRateData.value) return '1';
  return (dailyRateData.value as bigint).toString();
});

const stats = computed(() => {
  if (!globalStatsData.value) {
    return {
      totalDeposited: '0',
      totalWithdrawn: '0',
      totalFee: '0',
      activeUsers: '0',
      totalOrders: '0',
      completedOrders: '0',
      usdtBalance: '0',
      hafBalance: '0',
    };
  }

  const data = globalStatsData.value as any;
  return {
    totalDeposited: formatEther(data.statistics.totalDepositedUsdt),
    totalWithdrawn: formatEther(data.statistics.totalWithdrawnHaf),
    totalFee: formatEther(data.statistics.totalFeeCollectedHaf),
    activeUsers: data.statistics.totalActiveUsers.toString(),
    totalOrders: data.totalOrders.toString(),
    completedOrders: data.statistics.totalCompletedOrders.toString(),
    usdtBalance: formatEther(data.contractUsdtBalance),
    hafBalance: formatEther(data.contractHafBalance),
  };
});

// 写合约
const { writeContractAsync } = useWriteContract();

// 审核创世节点
const approveNode = async (applicant: string) => {
  isProcessing.value = true;
  try {
    toast.show(t('admin.approving'));
    
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'approveGenesisNode',
      args: [applicant as `0x${string}`],
    });
    
    toast.show(t('admin.approveSuccess'));
    await refetchPending();
    await refetchActive();
  } catch (error: any) {
    console.error('Approve error:', error);
    toast.show(error.shortMessage || t('admin.approveFailed'));
  } finally {
    isProcessing.value = false;
  }
};

const rejectNode = async (applicant: string) => {
  isProcessing.value = true;
  try {
    toast.show(t('admin.rejecting'));
    
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'rejectGenesisNode',
      args: [applicant as `0x${string}`],
    });
    
    toast.show(t('admin.rejectSuccess'));
    await refetchPending();
  } catch (error: any) {
    console.error('Reject error:', error);
    toast.show(error.shortMessage || t('admin.rejectFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 更新BTC数据（合并统计和挖矿数据更新）
const updateBtcData = async () => {
  isProcessing.value = true;
  try {
    // 更新BTC统计数据
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'updateBtcStats',
      args: [
        parseEther(String(btcForm.value.totalHashrate || '0')),
        parseEther(String(btcForm.value.globalHashrate || '0')),
        parseUnits(String(btcForm.value.dailyRewardPerT || '0'), 6),
        BigInt(btcForm.value.currentDifficulty || '0'),
        parseUnits(String(btcForm.value.btcPrice || '0'), 6),
        BigInt(Math.floor(Date.now() / 1000) + 86400 * 365), // 下次减产时间
      ],
    });

    // 如果填写了昨日已挖，再更新
    if (btcForm.value.yesterdayMined) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'updateTotalMined',
        args: [parseEther(String(btcForm.value.yesterdayMined))],
      });
    }

    toast.show(t('admin.updateSuccess'));
    refetchStats();
  } catch (error: any) {
    console.error('Update BTC error:', error);
    toast.show(error?.message || t('admin.updateFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 更新HAF价格
const updatePrice = async () => {
  if (!priceForm.value.newPrice && !priceForm.value.dailyRate) {
    toast.show(t('admin.fillAtLeastOne'));
    return;
  }

  isProcessing.value = true;
  try {
    if (priceForm.value.newPrice) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setHafPrice',
        args: [parseUnits(String(priceForm.value.newPrice), 6)],
      });
    }

    if (priceForm.value.dailyRate) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setDailyPriceIncreaseRate',
        args: [BigInt(priceForm.value.dailyRate || '0')],
      });
    }

    toast.show(t('admin.updateSuccess'));
  } catch (error: any) {
    console.error('Update price error:', error);
    toast.show(error?.message || t('admin.updateFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 触发价格更新
const triggerPriceUpdate = async () => {
  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'updatePrice',
    });
    toast.show(t('admin.priceUpdated'));
  } catch (error: any) {
    console.error('Trigger price update error:', error);
    toast.show(error?.message || t('admin.updateFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 更新费率设置
const updateFeeSettings = async () => {
  isProcessing.value = true;
  try {
    if (settingsForm.value.withdrawalFee) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setWithdrawalFee',
        args: [BigInt(Math.floor(Number(settingsForm.value.withdrawalFee) * 100))], // 百分比转为基点
      });
    }

    if (settingsForm.value.swapFee) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setSwapFee',
        args: [BigInt(Math.floor(Number(settingsForm.value.swapFee) * 100))],
      });
    }

    if (settingsForm.value.genesisNodeCost) {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setGenesisNodeCost',
        args: [parseUnits(String(settingsForm.value.genesisNodeCost), 6)],
      });
    }

    toast.show(t('admin.updateSuccess'));
  } catch (error: any) {
    console.error('Update fee settings error:', error);
    toast.show(error?.message || t('admin.updateFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 切换自动价格更新
const toggleAutoPriceUpdate = async () => {
  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setAutoPriceUpdate',
      args: [!autoPriceUpdateEnabled.data?.value],
    });
    toast.show(t('admin.updateSuccess'));
    autoPriceUpdateEnabled.refetch?.();
  } catch (error: any) {
    console.error('Toggle auto price update error:', error);
    toast.show(error?.message || t('admin.updateFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 强制结算用户
const forceSettleUser = async () => {
  if (!advancedForm.value.settleUserAddress) {
    toast.show(t('admin.enterAddress'));
    return;
  }

  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'forceSettleUser',
      args: [advancedForm.value.settleUserAddress as `0x${string}`],
    });
    toast.show(t('admin.operationSuccess'));
    advancedForm.value.settleUserAddress = '';
  } catch (error: any) {
    console.error('Force settle user error:', error);
    toast.show(error?.message || t('admin.operationFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 设置用户团队等级
const setUserTeamLevel = async () => {
  if (!advancedForm.value.teamLevelAddress) {
    toast.show(t('admin.enterAddress'));
    return;
  }

  if (advancedForm.value.teamLevel < 0 || advancedForm.value.teamLevel > 5) {
    toast.show(t('admin.invalidTeamLevel'));
    return;
  }

  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setUserTeamLevel',
      args: [
        advancedForm.value.teamLevelAddress as `0x${string}`,
        advancedForm.value.teamLevel,
      ],
    });
    toast.show(t('admin.operationSuccess'));
    advancedForm.value.teamLevelAddress = '';
  } catch (error: any) {
    console.error('Set user team level error:', error);
    toast.show(error?.message || t('admin.operationFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 紧急提现
const emergencyWithdraw = async () => {
  if (!advancedForm.value.withdrawAmount) {
    toast.show(t('admin.enterAmount'));
    return;
  }

  isProcessing.value = true;
  try {
    const tokenAddress = advancedForm.value.withdrawToken === 'USDT'
      ? import.meta.env.VITE_USDT_ADDRESS
      : CONTRACT_ADDRESS;

    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'emergencyWithdrawToken',
      args: [
        tokenAddress as `0x${string}`,
        parseUnits(String(advancedForm.value.withdrawAmount), 6),
      ],
    });
    toast.show(t('admin.withdrawSuccess'));
    advancedForm.value.withdrawAmount = '';
  } catch (error: any) {
    console.error('Emergency withdraw error:', error);
    toast.show(error?.message || t('admin.withdrawFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 暂停合约
const pauseContract = async () => {
  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'pause',
    });
    toast.show(t('admin.contractPaused'));
  } catch (error: any) {
    console.error('Pause contract error:', error);
    toast.show(error?.message || t('admin.operationFailed'));
  } finally {
    isProcessing.value = false;
  }
};

// 恢复合约
const unpauseContract = async () => {
  isProcessing.value = true;
  try {
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'unpause',
    });
    toast.show(t('admin.contractUnpaused'));
  } catch (error: any) {
    console.error('Unpause contract error:', error);
    toast.show(error?.message || t('admin.operationFailed'));
  } finally {
    isProcessing.value = false;
  }
};

onMounted(() => {
  // 初始化表单数据
  refetchStats();
});
</script>
