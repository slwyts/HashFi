<template>
  <div class="bg-white p-4 rounded-xl shadow-sm mb-6">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-center">
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.platformHashrate') }}</p>
        <p class="text-lg font-bold text-blue-600 mt-1">3.0 EH/s</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.networkHashrate') }}</p>
        <p class="text-lg font-bold mt-1">650.2 EH/s</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.dailyEarningsPerT') }}</p>
        <p class="text-lg font-bold mt-1">0.000001 BTC</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.btcPrice') }}</p>
        <p class="text-lg font-bold mt-1">$68,500.00</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.totalMined') }}</p>
        <p class="text-lg font-bold mt-1">1,234.56 BTC</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">{{ t('miningPool.yesterdayMined') }}</p>
        <p class="text-lg font-bold mt-1">5.67 BTC</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 未来这里可以从API获取真实的矿池数据
</script>