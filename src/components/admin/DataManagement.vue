<template>
  <div class="space-y-6">
    <!-- BTC数据管理 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">BTC矿池数据管理</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            平台算力 (T)
          </label>
          <input
            v-model="btcForm.totalHashrate"
            type="number"
            step="0.01"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="btcStats.totalHashrate"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            全网算力 (T)
          </label>
          <input
            v-model="btcForm.globalHashrate"
            type="number"
            step="0.01"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="btcStats.globalHashrate"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            每T日收益 (BTC)
          </label>
          <input
            v-model="btcForm.dailyRewardPerT"
            type="number"
            step="0.000001"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="btcStats.dailyRewardPerT"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            BTC价格 (USD)
          </label>
          <input
            v-model="btcForm.btcPrice"
            type="number"
            step="0.01"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="btcStats.btcPrice"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            当前难度
          </label>
          <input
            v-model="btcForm.currentDifficulty"
            type="number"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="btcStats.currentDifficulty"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            昨日挖矿 (BTC)
          </label>
          <input
            v-model="btcForm.yesterdayMined"
            type="number"
            step="0.00000001"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00000000"
          />
        </div>
      </div>

      <button
        @click="handleUpdateBtcData"
        :disabled="isProcessing()"
        class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        更新BTC数据
      </button>
    </div>

    <!-- 价格控制 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">HAF价格控制</h2>
      
      <div class="mb-6 p-4 bg-blue-50 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">当前价格</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">{{ formatPrice(priceSettings.currentPrice) }} USDT</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600">自动涨价</p>
            <p :class="[
              'text-lg font-semibold mt-1',
              priceSettings.autoUpdateEnabled ? 'text-green-600' : 'text-gray-600'
            ]">
              {{ priceSettings.autoUpdateEnabled ? '已启用' : '已禁用' }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            设置新价格 (USDT)
          </label>
          <input
            v-model="priceForm.newPrice"
            type="number"
            step="0.000001"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="priceSettings.currentPrice"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            每日涨幅 (‰)
          </label>
          <input
            v-model="priceForm.dailyRate"
            type="number"
            step="0.1"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="priceSettings.dailyIncreaseRate"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <button
          @click="handleUpdatePrice"
          :disabled="isProcessing()"
          class="py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          更新价格
        </button>
        <button
          @click="handleTriggerPriceUpdate"
          :disabled="isProcessing()"
          class="py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          触发价格更新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { parseUnits, parseEther } from 'viem';
import { useAdminData } from '../../composables/useAdminData';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import abi from '../../../contract/abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

const {
  btcStats,
  priceSettings,
  refetchBtcStats,
  refreshSystemData,
} = useAdminData();

const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const btcForm = ref({
  totalHashrate: '',
  globalHashrate: '',
  dailyRewardPerT: '',
  currentDifficulty: '',
  btcPrice: '',
  yesterdayMined: '',
});

const priceForm = ref({
  newPrice: '',
  dailyRate: '',
});

const formatPrice = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
};

const handleUpdateBtcData = async () => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'updateBtcStats',
      args: [
        parseEther(String(btcForm.value.totalHashrate || '0')),
        parseEther(String(btcForm.value.globalHashrate || '0')),
        parseUnits(String(btcForm.value.dailyRewardPerT || '0'), 6),
        BigInt(btcForm.value.currentDifficulty || '0'),
        parseUnits(String(btcForm.value.btcPrice || '0'), 6),
        BigInt(Math.floor(Date.now() / 1000) + 86400 * 365),
      ],
      operation: '正在更新BTC数据',
      successMessage: '更新成功',
      errorMessage: '更新失败',
      onConfirmed: async () => {
        if (btcForm.value.yesterdayMined) {
          await callContractWithRefresh(
            {
              address: CONTRACT_ADDRESS,
              abi,
              functionName: 'updateTotalMined',
              args: [parseEther(String(btcForm.value.yesterdayMined))],
              operation: '正在更新挖矿数据',
            },
            {}
          );
        }
        await refetchBtcStats();
        btcForm.value = {
          totalHashrate: '',
          globalHashrate: '',
          dailyRewardPerT: '',
          currentDifficulty: '',
          btcPrice: '',
          yesterdayMined: '',
        };
      },
    },
    {}
  );
};

const handleUpdatePrice = async () => {
  if (priceForm.value.newPrice) {
    await callContractWithRefresh(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setHafPrice',
        args: [parseUnits(String(priceForm.value.newPrice), 18)],
        operation: '正在更新价格',
        successMessage: '价格更新成功',
        errorMessage: '更新失败',
        onConfirmed: async () => {
          await refreshSystemData();
          priceForm.value.newPrice = '';
        },
      },
      {}
    );
  }

  if (priceForm.value.dailyRate) {
    await callContractWithRefresh(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'setDailyPriceIncreaseRate',
        args: [BigInt(priceForm.value.dailyRate || '0')],
        operation: '正在更新涨幅',
        successMessage: '涨幅更新成功',
        errorMessage: '更新失败',
        onConfirmed: async () => {
          await refreshSystemData();
          priceForm.value.dailyRate = '';
        },
      },
      {}
    );
  }
};

const handleTriggerPriceUpdate = async () => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'updatePrice',
      operation: '正在触发价格更新',
      successMessage: '价格已更新',
      errorMessage: '更新失败',
      onConfirmed: async () => {
        await refreshSystemData();
      },
    },
    {}
  );
};
</script>
