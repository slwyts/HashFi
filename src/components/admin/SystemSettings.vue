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

          <!-- <div>
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
          </div> -->

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

      <!-- LP流动性管理 -->
      <div class="mb-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-800">LP流动性管理</h3>
            <p class="text-sm text-gray-600">向 HAF/USDT 交易对添加流动性,调整池子深度和价格</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              USDT 数量
            </label>
            <input
              v-model="liquidityForm.usdtAmount"
              type="number"
              step="1"
              min="0"
              class="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="输入 USDT 数量"
            />
            <p class="text-xs text-gray-500 mt-1">添加 USDT 会提升 HAF 价格</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              HAF 数量
            </label>
            <input
              v-model="liquidityForm.hafAmount"
              type="number"
              step="1"
              min="0"
              class="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="输入 HAF 数量"
            />
            <p class="text-xs text-gray-500 mt-1">添加 HAF 会降低 HAF 价格</p>
          </div>
        </div>

        <div class="mb-4 p-3 bg-purple-100 rounded-lg">
          <p class="text-xs text-purple-700 flex items-start gap-2">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>提示：</strong>
              首次添加流动性需要同时添加 USDT 和 HAF 来设定初始价格。
              后续可以只添加一种代币来调整价格：只添加 USDT 会提升价格，只添加 HAF 会降低价格。
            </span>
          </p>
        </div>

        <button
          @click="handleAddLiquidity"
          :disabled="isProcessing() || !hasLiquidityInput"
          class="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>添加流动性</span>
          </div>
        </button>
      </div>

      <!-- 自动价格更新 -->
      <!-- <div class="mb-6 p-5 bg-green-50 rounded-lg">
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
      </div> -->

      <!-- HAF 高级特性开关 -->
      <div class="mb-6 p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-800">HAF 高级特性开关</h3>
            <p class="text-sm text-gray-600">紧急情况下可禁用 HAF 代币的高级特性，保证基本交易功能</p>
          </div>
        </div>

        <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-100">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <div :class="[
                'w-3 h-3 rounded-full',
                systemStatus.hafAdvancedFeaturesEnabled ? 'bg-green-500' : 'bg-red-500'
              ]"></div>
              <span :class="[
                'font-semibold',
                systemStatus.hafAdvancedFeaturesEnabled ? 'text-green-600' : 'text-red-600'
              ]">
                {{ systemStatus.hafAdvancedFeaturesEnabled ? '高级特性已启用' : '高级特性已禁用' }}
              </span>
            </div>
            <p class="text-xs text-gray-500">
              {{ systemStatus.hafAdvancedFeaturesEnabled
                ? '当前状态正常：买卖税、每日燃烧、自动销毁、持币分红等功能正常运行'
                : '紧急模式：仅支持普通 ERC20 转账，所有高级特性已暂停' }}
            </p>
          </div>
          <button
            @click="handleToggleAdvancedFeatures"
            :disabled="isProcessing()"
            :class="[
              'px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl ml-4',
              systemStatus.hafAdvancedFeaturesEnabled
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
            ]"
          >
            {{ systemStatus.hafAdvancedFeaturesEnabled ? '禁用高级特性' : '启用高级特性' }}
          </button>
        </div>

        <div class="mt-4 p-3 bg-orange-100 rounded-lg">
          <p class="text-xs text-orange-700 flex items-start gap-2">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>警告：</strong>
              禁用高级特性后，HAF 代币将只执行普通 ERC20 转账，不收取买入/卖出税，不执行每日燃烧、自动销毁和持币分红。
              此功能仅用于紧急情况，防止高级特性出现 bug 导致代币无法交易。
            </span>
          </p>
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
import { abi } from '@/core/contract';

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

const liquidityForm = ref({
  usdtAmount: '',
  hafAmount: '',
});

const hasFeesChanges = computed(() => {
  return feeForm.value.withdrawalFee !== '' || 
         feeForm.value.swapFee !== '' || 
         feeForm.value.genesisNodeCost !== '';
});

const hasLiquidityInput = computed(() => {
  const usdt = Number(liquidityForm.value.usdtAmount);
  const haf = Number(liquidityForm.value.hafAmount);
  return (usdt > 0 && !isNaN(usdt)) || (haf > 0 && !isNaN(haf));
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
          args: [BigInt(Math.floor(Number(feeForm.value.withdrawalFee)))],
          operation: '正在更新提现手续费',
          successMessage: '提现手续费更新成功',
          errorMessage: '更新失败',
        },
        {}
      )
    );
  }

  // if (feeForm.value.swapFee) {
  //   updates.push(
  //     callContractWithRefresh(
  //       {
  //         address: CONTRACT_ADDRESS,
  //         abi,
  //         functionName: 'setSwapFee',
  //         args: [BigInt(Math.floor(Number(feeForm.value.swapFee)))],
  //         operation: '正在更新闪兑手续费',
  //         successMessage: '闪兑手续费更新成功',
  //         errorMessage: '更新失败',
  //       },
  //       {}
  //     )
  //   );
  // }

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

const handleAddLiquidity = async () => {
  const usdtAmount = liquidityForm.value.usdtAmount ? parseEther(String(liquidityForm.value.usdtAmount)) : BigInt(0);
  const hafAmount = liquidityForm.value.hafAmount ? parseEther(String(liquidityForm.value.hafAmount)) : BigInt(0);

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'addLiquidity',
      args: [usdtAmount, hafAmount],
      operation: '正在添加流动性',
      successMessage: 'LP流动性添加成功',
      errorMessage: '添加流动性失败',
      onConfirmed: async () => {
        await refreshSystemData();
        liquidityForm.value = {
          usdtAmount: '',
          hafAmount: '',
        };
      },
    },
    {}
  );
};

// const handleToggleAutoPrice = async () => {
//   await callContractWithRefresh(
//     {
//       address: CONTRACT_ADDRESS,
//       abi,
//       functionName: 'setAutoPriceUpdate',
//       args: [!priceSettings.value.autoUpdateEnabled],
//       operation: priceSettings.value.autoUpdateEnabled ? '正在禁用自动涨价' : '正在启用自动涨价',
//       successMessage: priceSettings.value.autoUpdateEnabled ? '自动涨价已禁用' : '自动涨价已启用',
//       errorMessage: '操作失败',
//       onConfirmed: async () => {
//         await refreshSystemData();
//       },
//     },
//     {}
//   );
// };

const handleToggleAdvancedFeatures = async () => {
  const newState = !systemStatus.value.hafAdvancedFeaturesEnabled;
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setHafAdvancedFeatures',
      args: [newState],
      operation: newState ? '正在启用 HAF 高级特性' : '正在禁用 HAF 高级特性',
      successMessage: newState ? 'HAF 高级特性已启用' : 'HAF 高级特性已禁用',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refreshSystemData();
      },
    },
    {}
  );
};
</script>
