<template>
  <div class="space-y-6">
    <!-- 矿池数据管理 (Worker API) -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">矿池平台数据管理</h2>
      
      <div class="mb-6 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-gray-600 mb-2">实时数据（自动获取）</p>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-xs text-gray-500">BTC价格</p>
            <p class="text-lg font-bold text-blue-600">${{ btcData?.btcPrice?.toFixed(2) || '0.00' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">全网算力</p>
            <p class="text-lg font-bold text-blue-600">{{ btcData?.networkHashrate?.toFixed(2) || '0' }} EH/s</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">当前难度</p>
            <p class="text-lg font-bold text-blue-600">{{ formatDifficulty(btcData?.difficulty || 0) }}</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            平台算力 (T)
          </label>
          <input
            v-model="poolForm.platformHashrate"
            type="number"
            step="0.01"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="String(btcData?.platformHashrate || 0)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            每T日收益 (BTC)
          </label>
          <input
            v-model="poolForm.dailyRewardPerT"
            type="number"
            step="0.00000001"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="String(btcData?.dailyRewardPerT || 0)"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            累计已挖 (BTC)
          </label>
          <input
            v-model="poolForm.totalMined"
            type="number"
            step="0.00000001"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :placeholder="String(btcData?.totalMined || 0)"
          />
        </div>
      </div>

      <button
        @click="handleUpdatePoolData"
        :disabled="isUpdatingPool"
        class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {{ isUpdatingPool ? '更新中...' : '更新矿池数据' }}
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

      <button
        @click="handleUpdatePrice"
        :disabled="isProcessing()"
        class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        更新价格/涨幅设置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { parseUnits } from 'viem';
import { useAdminData } from '../../composables/useAdminData';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import { useBitcoinData } from '@/composables/useBitcoinData';
import { useToast } from '@/composables/useToast';
import { abi } from '@/core/contract';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const WORKER_API = import.meta.env.VITE_API_URL || 'https://hashfi-api.a3144390867.workers.dev';

const {
  priceSettings,
  refreshSystemData,
} = useAdminData();

const { callContractWithRefresh, isProcessing } = useEnhancedContract();
const { btcData, refetch: refetchBtcData } = useBitcoinData();
const toast = useToast();

// ✅ 矿池数据表单
const poolForm = ref({
  platformHashrate: '',
  dailyRewardPerT: '',
  totalMined: '',
});

const priceForm = ref({
  newPrice: '',
  dailyRate: '',
});

const isUpdatingPool = ref(false);

const formatPrice = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
};

const formatDifficulty = (diff: number) => {
  if (diff >= 1e12) {
    return (diff / 1e12).toFixed(2) + 'T';
  }
  return diff.toLocaleString('en-US');
};

// ✅ 更新矿池数据到 Worker
const handleUpdatePoolData = async () => {
  isUpdatingPool.value = true;
  
  try {
    const updateData: any = {};
    
    if (poolForm.value.platformHashrate) {
      updateData.platformHashrate = parseFloat(poolForm.value.platformHashrate);
    }
    if (poolForm.value.dailyRewardPerT) {
      updateData.dailyRewardPerT = parseFloat(poolForm.value.dailyRewardPerT);
    }
    if (poolForm.value.totalMined) {
      updateData.totalMined = parseFloat(poolForm.value.totalMined);
    }
    
    if (Object.keys(updateData).length === 0) {
      toast.show('请至少填写一个字段', 'warning');
      return;
    }
    
    // 调用 Worker API
    const response = await fetch(`${WORKER_API}/mining-pool-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_signature') || 'fake-signature-12345678'}`,
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error('更新失败');
    }
    
    const result = await response.json();
    
    if (result.success) {
      toast.success('矿池数据更新成功');
      
      // 重新获取数据
      await refetchBtcData();
      
      // 清空表单
      poolForm.value = {
        platformHashrate: '',
        dailyRewardPerT: '',
        totalMined: '',
      };
    } else {
      throw new Error(result.error || '更新失败');
    }
  } catch (error) {
    console.error('Failed to update pool data:', error);
    toast.error(error instanceof Error ? error.message : '更新失败');
  } finally {
    isUpdatingPool.value = false;
  }
};

const handleUpdatePrice = async () => {
  // 检查是否至少填写了一个字段
  if (!priceForm.value.newPrice && !priceForm.value.dailyRate) {
    toast.warning('请至少填写一个字段');
    return;
  }

  // 更新价格
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

  // 更新每日涨幅
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
</script>
