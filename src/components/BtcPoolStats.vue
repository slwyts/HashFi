<template>
  <div class="card p-6 mb-6 bg-gradient-to-br from-white to-blue-50">
    <div class="grid grid-cols-3 md:grid-cols-3 gap-4 md:gap-6 text-center">
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.platformHashrate') }}</p>
        <p class="text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {{ totalHashrate }} <span class="font-extrabold">T</span>
        </p>
      </div>
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.networkHashrate') }}</p>
        <p class="text-base md:text-xl font-bold text-gray-800">
          {{ globalHashrate }} EH/s
        </p>
      </div>
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.dailyEarningsPerT') }}</p>
        <p class="text-base md:text-xl font-bold text-gray-800">{{ dailyRewardPerT }} BTC</p>
      </div>
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.btcPrice') }}</p>
        <p class="text-base md:text-xl font-bold text-green-600">
          ${{ btcPrice }}
        </p>
      </div>
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.totalMined') }}</p>
        <p class="text-base md:text-xl font-bold text-gray-800">{{ totalMined }} BTC</p>
      </div>
      <div class="group">
        <p class="text-xs md:text-sm text-gray-500 mb-1 md:mb-2">{{ t('miningPool.difficulty') }}</p>
        <p class="text-base md:text-xl font-bold text-gray-800">
          {{ difficulty }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBitcoinData } from '@/composables/useBitcoinData';

const { t } = useI18n();

// ✅ 完全使用 Worker API 获取实时比特币数据 + 平台矿池数据
const { btcData } = useBitcoinData();

// 平台总算力（从 Worker）- 使用 - 作为占位符
const totalHashrate = computed(() => {
  if (!btcData.value || btcData.value.platformHashrate <= 0) return '-';
  return btcData.value.platformHashrate.toLocaleString('en-US', { maximumFractionDigits: 2 });
});

// 全网算力（从 Worker）
const globalHashrate = computed(() => {
  if (!btcData.value || btcData.value.networkHashrate <= 0) return '-';
  return btcData.value.networkHashrate.toLocaleString('en-US', { maximumFractionDigits: 2 });
});

// 每T日收益（从 Worker）
const dailyRewardPerT = computed(() => {
  if (!btcData.value || btcData.value.dailyRewardPerT <= 0) return '-';
  return btcData.value.dailyRewardPerT.toFixed(8);
});

// BTC 价格（从 Worker）
const btcPrice = computed(() => {
  if (!btcData.value || btcData.value.btcPrice <= 0) return '-';
  return btcData.value.btcPrice.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
});

// 累计已挖（从 Worker）
const totalMined = computed(() => {
  if (!btcData.value || btcData.value.totalMined <= 0) return '-';
  return btcData.value.totalMined.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 8 
  });
});

// 难度（从 Worker）
const difficulty = computed(() => {
  if (!btcData.value || btcData.value.difficulty <= 0) return '-';
  const diff = btcData.value.difficulty;
  if (diff >= 1e12) {
    return (diff / 1e12).toFixed(2) + 'T';
  }
  return diff.toLocaleString('en-US');
});
</script>

<style scoped>
.group:hover p:last-child {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}
</style>