<template>
  <div class="card p-6 mb-6 bg-gradient-to-br from-white to-blue-50">
    <div v-if="isLoading" class="text-center py-4 text-gray-500">
      {{ t('common.loading') }}...
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.platformHashrate') }}</p>
        <p class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {{ totalHashrate }} T
        </p>
      </div>
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.networkHashrate') }}</p>
        <p class="text-xl font-bold text-gray-800">{{ globalHashrate }} T</p>
      </div>
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.dailyEarningsPerT') }}</p>
        <p class="text-xl font-bold text-gray-800">{{ dailyRewardPerT }} BTC</p>
      </div>
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.btcPrice') }}</p>
        <p class="text-xl font-bold text-green-600">${{ btcPrice }}</p>
      </div>
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.totalMined') }}</p>
        <p class="text-xl font-bold text-gray-800">{{ totalMined }} BTC</p>
      </div>
      <div class="group">
        <p class="text-sm text-gray-500 mb-2">{{ t('miningPool.difficulty') }}</p>
        <p class="text-xl font-bold text-gray-800">{{ difficulty }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReadContract } from '@wagmi/vue';
import { formatEther, formatUnits } from 'viem';
import abi from '../../contract/abi.json';

const { t } = useI18n();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// 读取 BTC 统计数据
const { data: btcStatsData, isLoading } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getBtcStats',
});

// 格式化数据
const totalHashrate = computed(() => {
  if (!btcStatsData.value) return '0';
  const value = Number(formatEther((btcStatsData.value as any).totalHashrate || 0n));
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
});

const globalHashrate = computed(() => {
  if (!btcStatsData.value) return '0';
  const value = Number(formatEther((btcStatsData.value as any).globalHashrate || 0n));
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
});

const dailyRewardPerT = computed(() => {
  if (!btcStatsData.value) return '0.000000';
  return formatUnits((btcStatsData.value as any).dailyRewardPerT || 0n, 6);
});

const btcPrice = computed(() => {
  if (!btcStatsData.value) return '0.00';
  const value = Number(formatUnits((btcStatsData.value as any).btcPrice || 0n, 6));
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

const totalMined = computed(() => {
  if (!btcStatsData.value) return '0.00';
  const value = Number(formatEther((btcStatsData.value as any).totalMined || 0n));
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
});

const difficulty = computed(() => {
  if (!btcStatsData.value) return '0';
  const value = (btcStatsData.value as any).currentDifficulty || 0n;
  return value.toLocaleString('en-US');
});
</script>

<style scoped>
.group:hover p:last-child {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}
</style>