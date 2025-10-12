<template>
  <div class="bg-gray-50 min-h-screen p-4">
    <div class="bg-blue-600 text-white p-5 rounded-xl shadow-lg mb-6 text-center">
      <h3 class="font-bold text-xl mb-3">{{ t('miningPoolPage.platformTotalHashrate') }}</h3>
      <p class="text-4xl font-bold font-mono tracking-wider">{{ platformHashrate }} EH/s</p>
      <p class="text-sm opacity-80 mt-1">{{ t('miningPoolPage.globalShare') }} ≈ {{ globalShare }}%</p>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl shadow-sm text-center">
        <p class="text-sm text-gray-500">{{ t('miningPoolPage.yesterdayMined') }} (BTC)</p>
        <p class="text-2xl font-bold mt-1 text-yellow-500">{{ yesterdayMined }}</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm text-center">
        <p class="text-sm text-gray-500">{{ t('miningPoolPage.cumulativeMined') }} (BTC)</p>
        <p class="text-2xl font-bold mt-1 text-yellow-500">{{ totalMined }}</p>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl shadow-sm">
        <h3 class="font-bold text-lg mb-4">{{ t('miningPoolPage.networkData') }}</h3>
        <ul class="divide-y divide-gray-100">
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.networkHashrate') }}</span>
            <span class="font-semibold font-mono">{{ networkHashrate }} EH/s</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.dailyEarningsPerT') }}</span>
            <span class="font-semibold font-mono">{{ dailyEarningsPerT }} BTC</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.currentDifficulty') }}</span>
            <span class="font-semibold font-mono">{{ currentDifficulty }} T</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.btcPrice') }}</span>
            <span class="font-semibold font-mono">${{ btcPrice }}</span>
          </li>
           <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.nextHalving') }}</span>
            <span class="font-semibold font-mono">{{ nextHalvingDays }} {{ t('miningPoolPage.days') }}</span>
          </li>
        </ul>
     </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReadContract } from '@wagmi/vue';
import { formatUnits } from 'viem';
import { abi } from '@/core/contract';

const { t } = useI18n();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// ========== 获取 BTC 挖矿统计数据 ==========
const { data: btcStats } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getBtcStats',
  query: {
    refetchInterval: 30000, // 每30秒刷新一次
  }
});

// 平台总算力 (EH/s)
const platformHashrate = computed(() => {
  if (!btcStats.value) return '0.00';
  const hashrate = (btcStats.value as any)[0]; // platformTotalHashrate
  // 假设存储的是 PH/s (10^15 H/s)，转换为 EH/s (10^18 H/s)
  return (Number(hashrate) / 1000).toFixed(2);
});

// 全网算力 (EH/s)
const networkHashrate = computed(() => {
  if (!btcStats.value) return '0.00';
  const hashrate = (btcStats.value as any)[1]; // networkTotalHashrate
  // 转换为 EH/s
  return (Number(hashrate) / 1000).toFixed(2);
});

// 全球份额
const globalShare = computed(() => {
  const platform = parseFloat(platformHashrate.value);
  const network = parseFloat(networkHashrate.value);
  if (network === 0) return '0.00';
  return ((platform / network) * 100).toFixed(2);
});

// 每T日收益 (BTC)
const dailyEarningsPerT = computed(() => {
  if (!btcStats.value) return '0.00000000';
  const earnings = (btcStats.value as any)[2]; // dailyOutputPerTPerDay
  return parseFloat(formatUnits(earnings as bigint, 18)).toFixed(8);
});

// 当前难度 (T)
const currentDifficulty = computed(() => {
  if (!btcStats.value) return '0.00';
  const difficulty = (btcStats.value as any)[3]; // currentDifficulty
  // 转换为 T (万亿)
  return (Number(difficulty) / 1000000000000).toFixed(2);
});

// BTC 价格 (USD)
const btcPrice = computed(() => {
  if (!btcStats.value) return '0.00';
  const price = (btcStats.value as any)[4]; // btcPrice (以 wei 形式存储，6位精度)
  return parseFloat(formatUnits(price as bigint, 6)).toFixed(2);
});

// 昨日挖出 (BTC)
const yesterdayMined = computed(() => {
  if (!btcStats.value) return '0.00';
  const mined = (btcStats.value as any)[5]; // yesterdayTotalMined
  return parseFloat(formatUnits(mined as bigint, 18)).toFixed(2);
});

// 累计已挖 (BTC)
const totalMined = computed(() => {
  if (!btcStats.value) return '0.00';
  const mined = (btcStats.value as any)[6]; // totalMined
  return parseFloat(formatUnits(mined as bigint, 18)).toFixed(2);
});

// 下次减半天数 (预估)
const nextHalvingDays = computed(() => {
  // 这个数据通常是固定的，或者需要后端计算
  // 这里简化处理，显示一个预估值
  return '~1025';
});
</script>