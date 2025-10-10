<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">系统设置</h2>
      
      <!-- 费率设置 -->
      <div class="mb-6 p-5 bg-blue-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">费率设置</h3>
        <p class="text-sm text-gray-600 mb-4">调整提现手续费、闪兑手续费和创世节点申请费用</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              提现手续费 (%)
            </label>
            <div class="relative">
              <input
                v-model="feeForm.withdrawalFee"
                type="number"
                step="0.1"
                min="0"
                max="100"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :placeholder="currentFees.withdrawalFee.toString()"
              />
              <span class="absolute right-4 top-3 text-gray-400">%</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">当前: {{ currentFees.withdrawalFee }}%</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              闪兑手续费 (%)
            </label>
            <div class="relative">
              <input
                v-model="feeForm.swapFee"
                type="number"
                step="0.1"
                min="0"
                max="100"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :placeholder="currentFees.swapFee.toString()"
              />
              <span class="absolute right-4 top-3 text-gray-400">%</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">当前: {{ currentFees.swapFee }}%</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              创世节点费用 (USDT)
            </label>
            <input
              v-model="feeForm.genesisNodeCost"
              type="number"
              min="0"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :placeholder="currentFees.genesisNodeCost"
            />
            <p class="text-xs text-gray-500 mt-1">当前: {{ currentFees.genesisNodeCost }} USDT</p>
          </div>
        </div>

        <button
          @click="handleUpdateFees"
          :disabled="isProcessing() || !hasFeesChanges"
          class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          更新费率设置
        </button>
      </div>

      <!-- 自动价格更新 -->
      <div class="mb-6 p-5 bg-green-50 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-800">自动价格更新</h3>
            <p class="text-sm text-gray-600 mt-1">启用后，HAF价格将按照设定的日涨幅自动增长</p>
            <p class="text-xs text-gray-500 mt-2">
              当前日涨幅: <span class="font-semibold">{{ priceSettings.dailyIncreaseRate }}‰</span> (即 {{ (Number(priceSettings.dailyIncreaseRate) / 10).toFixed(2) }}%)
            </p>
          </div>
          <button
            @click="handleToggleAutoPrice"
            :disabled="isProcessing()"
            :class="[
              'px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl',
              priceSettings.autoUpdateEnabled
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
            ]"
          >
            {{ priceSettings.autoUpdateEnabled ? '已启用 - 点击禁用' : '已禁用 - 点击启用' }}
          </button>
        </div>
      </div>

      <!-- 系统状态显示 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">当前HAF价格</p>
              <p class="text-2xl font-bold text-blue-600 mt-1">{{ formatPrice(priceSettings.currentPrice) }} USDT</p>
            </div>
            <svg class="w-12 h-12 text-blue-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">合约状态</p>
              <p :class="[
                'text-2xl font-bold mt-1',
                systemStatus.isPaused ? 'text-red-600' : 'text-green-600'
              ]">
                {{ systemStatus.isPaused ? '已暂停' : '正常运行' }}
              </p>
            </div>
            <div :class="[
              'w-12 h-12 rounded-full flex items-center justify-center',
              systemStatus.isPaused ? 'bg-red-500' : 'bg-green-500'
            ]">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!systemStatus.isPaused" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 质押级别配置（只读展示） -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h3 class="text-lg font-bold mb-4 text-gray-800">质押级别配置</h3>
      <p class="text-sm text-gray-600 mb-4">当前系统的质押级别设置（只读展示）</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-amber-600 rounded"></div>
            <h4 class="font-semibold text-gray-800">青铜级</h4>
          </div>
          <div class="space-y-1 text-sm">
            <p class="text-gray-600">投资范围: <span class="font-semibold">100 - 499 USDT</span></p>
            <p class="text-gray-600">日利率: <span class="font-semibold text-green-600">0.70%</span></p>
            <p class="text-gray-600">出局倍数: <span class="font-semibold text-blue-600">1.5x</span></p>
          </div>
        </div>

        <div class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-300">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-gray-400 rounded"></div>
            <h4 class="font-semibold text-gray-800">白银级</h4>
          </div>
          <div class="space-y-1 text-sm">
            <p class="text-gray-600">投资范围: <span class="font-semibold">500 - 999 USDT</span></p>
            <p class="text-gray-600">日利率: <span class="font-semibold text-green-600">0.80%</span></p>
            <p class="text-gray-600">出局倍数: <span class="font-semibold text-blue-600">2.0x</span></p>
          </div>
        </div>

        <div class="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-300">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-yellow-500 rounded"></div>
            <h4 class="font-semibold text-gray-800">黄金级</h4>
          </div>
          <div class="space-y-1 text-sm">
            <p class="text-gray-600">投资范围: <span class="font-semibold">1,000 - 2,999 USDT</span></p>
            <p class="text-gray-600">日利率: <span class="font-semibold text-green-600">0.90%</span></p>
            <p class="text-gray-600">出局倍数: <span class="font-semibold text-blue-600">2.5x</span></p>
          </div>
        </div>

        <div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-300">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-blue-500 rounded"></div>
            <h4 class="font-semibold text-gray-800">钻石级</h4>
          </div>
          <div class="space-y-1 text-sm">
            <p class="text-gray-600">投资范围: <span class="font-semibold">3,000+ USDT</span></p>
            <p class="text-gray-600">日利率: <span class="font-semibold text-green-600">1.00%</span></p>
            <p class="text-gray-600">出局倍数: <span class="font-semibold text-blue-600">3.0x</span></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { parseEther } from 'viem';
import { useAdminData } from '../../composables/useAdminData';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import abi from '../../../contract/abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

const {
  priceSettings,
  feeSettings: currentFees,
  systemStatus,
  refreshSystemData,
} = useAdminData();

const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const feeForm = ref({
  withdrawalFee: '',
  swapFee: '',
  genesisNodeCost: '',
});

const hasFeesChanges = computed(() => {
  return feeForm.value.withdrawalFee !== '' || 
         feeForm.value.swapFee !== '' || 
         feeForm.value.genesisNodeCost !== '';
});

const formatPrice = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
};

const handleUpdateFees = async () => {
  const updates = [];

  if (feeForm.value.withdrawalFee) {
    updates.push(
      callContractWithRefresh(
        {
          address: CONTRACT_ADDRESS,
          abi,
          functionName: 'setWithdrawalFee',
          args: [BigInt(Math.floor(Number(feeForm.value.withdrawalFee) * 100))],
          operation: '正在更新提现手续费',
          successMessage: '提现手续费更新成功',
          errorMessage: '更新失败',
        },
        {}
      )
    );
  }

  if (feeForm.value.swapFee) {
    updates.push(
      callContractWithRefresh(
        {
          address: CONTRACT_ADDRESS,
          abi,
          functionName: 'setSwapFee',
          args: [BigInt(Math.floor(Number(feeForm.value.swapFee) * 100))],
          operation: '正在更新闪兑手续费',
          successMessage: '闪兑手续费更新成功',
          errorMessage: '更新失败',
        },
        {}
      )
    );
  }

  if (feeForm.value.genesisNodeCost) {
    updates.push(
      callContractWithRefresh(
        {
          address: CONTRACT_ADDRESS,
          abi,
          functionName: 'setGenesisNodeCost',
          args: [parseEther(String(feeForm.value.genesisNodeCost))],
          operation: '正在更新创世节点费用',
          successMessage: '创世节点费用更新成功',
          errorMessage: '更新失败',
        },
        {}
      )
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
    await refreshSystemData();
    feeForm.value = {
      withdrawalFee: '',
      swapFee: '',
      genesisNodeCost: '',
    };
  }
};

const handleToggleAutoPrice = async () => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setAutoPriceUpdate',
      args: [!priceSettings.value.autoUpdateEnabled],
      operation: priceSettings.value.autoUpdateEnabled ? '正在禁用自动涨价' : '正在启用自动涨价',
      successMessage: priceSettings.value.autoUpdateEnabled ? '自动涨价已禁用' : '自动涨价已启用',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refreshSystemData();
      },
    },
    {}
  );
};
</script>
