<template>
  <div class="bg-gray-50 min-h-screen p-4">
    <div class="bg-blue-600 text-white p-5 rounded-xl shadow-lg mb-6 text-center">
      <h3 class="font-bold text-xl mb-3">{{ t('miningPoolPage.platformTotalHashrate') }}</h3>
      <p class="text-4xl font-bold font-mono tracking-wider">1.2 EH/s</p>
      <p class="text-sm opacity-80 mt-1">{{ t('miningPoolPage.globalShare') }} ≈ 1.5%</p>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl shadow-sm text-center">
        <p class="text-sm text-gray-500">{{ t('miningPoolPage.yesterdayMined') }} (BTC)</p>
        <p class="text-2xl font-bold mt-1 text-yellow-500">5.81</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm text-center">
        <p class="text-sm text-gray-500">{{ t('miningPoolPage.cumulativeMined') }} (BTC)</p>
        <p class="text-2xl font-bold mt-1 text-yellow-500">215.43</p>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl shadow-sm">
        <h3 class="font-bold text-lg mb-4">{{ t('miningPoolPage.networkData') }}</h3>
        <ul class="divide-y divide-gray-100">
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.networkHashrate') }}</span>
            <span class="font-semibold font-mono">798.32 EH/s</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.dailyEarningsPerT') }}</span>
            <span class="font-semibold font-mono">0.00000185 BTC</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.currentDifficulty') }}</span>
            <span class="font-semibold font-mono">112.35 T</span>
          </li>
          <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.btcPrice') }}</span>
            <span class="font-semibold font-mono">$68,500.00</span>
          </li>
           <li class="py-3 flex justify-between items-center">
            <span class="text-gray-600">{{ t('miningPoolPage.nextHalving') }}</span>
            <span class="font-semibold font-mono">≈ 1025 {{ t('miningPoolPage.days') }}</span>
          </li>
        </ul>
     </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 注意：这里的数据是用于UI展示的模拟数据。
// 在实际开发中，您需要通过API从后端获取这些实时数据。
// "平台累计已挖" 和 "昨日已挖" 根据文档需要后台可以设置。
</script>