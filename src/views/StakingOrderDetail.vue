<template>
  <div class="p-4 bg-white min-h-screen">
    <div class="flex items-center mb-6">
      <button @click="router.back()" class="mr-4 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 class="text-xl font-bold">{{ t('orderDetail.title') }}</h2>
    </div>

    <div v-if="order" class="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.stakingLevel') }}</span>
          <span class="font-semibold">{{ t(order.plan) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.stakingAmount') }}</span>
          <span class="font-semibold font-mono">{{ order.amount }} USDT</span>
        </div>
         <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.multiplier') }}</span>
          <span class="font-semibold">{{ getMultiplier(order.plan) }}x</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.totalQuota') }} / {{ t('orderDetail.releasedQuota') }}</span>
          <span class="font-semibold font-mono">{{ order.totalQuota }} / {{ order.released }} USDT</span>
        </div>
         <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div class="bg-blue-600 h-2 rounded-full" :style="{ width: (order.released / order.totalQuota * 100) + '%' }"></div>
        </div>
        <hr class="my-2 border-gray-200"/>
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.releasedHaf') }}</span>
          <span class="font-semibold text-blue-600 font-mono">{{ (parseFloat(order.releasedHAF) * 0.95).toFixed(4) }} HAF</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.stakingTime') }}</span>
          <span class="font-semibold font-mono">{{ order.time }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">{{ t('orderDetail.status') }}</span>
           <span
              :class="['px-2 py-0.5 text-xs rounded-full font-semibold', order.status === '进行中' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600']"
            >
              {{ order.status === '进行中' ? t('orderDetail.statusInProgress') : t('orderDetail.statusFinished') }}
            </span>
        </div>
    </div>
    <div v-else class="text-center text-gray-500 mt-20">
      <p>{{ t('orderDetail.notFound') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const order = ref<any>(null);

onMounted(() => {
  // 从路由 state 获取订单数据
  const orderData = window.history.state?.order;
  
  if (orderData) {
    order.value = orderData;
  } else {
    // 如果没有数据，返回上一页
    console.error('No order data found in route state');
  }
});

const getMultiplier = (plan: string) => {
    const planMap: { [key: string]: number } = {
        'stakingPage.bronze': 1.5,
        'stakingPage.silver': 2.0,
        'stakingPage.gold': 2.5,
        'stakingPage.diamond': 3.0,
    };
    return planMap[plan] || 0;
}
</script>