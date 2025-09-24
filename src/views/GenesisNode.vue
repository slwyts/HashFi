<template>
  <div class="bg-gray-50 min-h-screen">
    <div class="bg-white p-4 flex items-center shadow-sm">
      <button @click="$router.back()" class="mr-4 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 class="text-xl font-bold">{{ t('nodeCenter.title') }}</h2>
    </div>

    <div v-if="!userIsNode" class="p-4">
      <div class="bg-white rounded-xl shadow-sm p-6 text-center">
        <img src="/icons/ecosystem.svg" class="w-20 h-20 mx-auto mb-4" alt="Genesis Node">
        <h3 class="text-2xl font-bold mb-2">{{ t('nodeCenter.applyTitle') }}</h3>
        <p class="text-gray-600 mb-6">{{ t('nodeCenter.applyDesc') }}</p>
        
        <div class="text-left space-y-3 mb-8">
            <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">1</span>
                <p><span class="font-bold">{{ t('nodeCenter.condition') }}: </span>{{ t('nodeCenter.conditionDesc') }}</p>
            </div>
            <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">2</span>
                <p><span class="font-bold">{{ t('nodeCenter.rights') }}: </span>{{ t('nodeCenter.rightsDesc') }}</p>
            </div>
             <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">3</span>
                <p><span class="font-bold">{{ t('nodeCenter.exit') }}: </span>{{ t('nodeCenter.exitDesc') }}</p>
            </div>
        </div>

        <button class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors">
          {{ t('nodeCenter.applyNow') }}
        </button>
      </div>
    </div>

    <div v-else class="p-4">
      <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg">{{ t('nodeCenter.myDividends') }}</h3>
            <span class="bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full text-sm">{{ t('nodeCenter.nodeActive') }}</span>
        </div>
        <div class="text-center mb-4">
            <p class="text-sm text-gray-500">{{ t('nodeCenter.totalReceived') }} (USDT)</p>
            <p class="text-4xl font-bold my-1">8,520.00</p>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 mb-1">
            <div class="bg-green-500 h-3 rounded-full" style="width: 56.8%"></div>
        </div>
        <div class="text-xs text-gray-500 flex justify-between">
            <span>0</span>
            <span>15,000 USDT (3x)</span>
        </div>
      </div>

      <div>
        <h3 class="font-bold text-lg mb-3">{{ t('nodeCenter.dividendRecords') }}</h3>
        <div class="bg-white p-4 rounded-xl shadow-sm space-y-3">
          <div v-for="record in dividendRecords" :key="record.id" class="flex justify-between items-center">
            <div>
              <p class="font-semibold">{{ t('nodeCenter.dailyDividend') }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ record.date }}</p>
            </div>
            <p class="font-bold text-green-600">+{{ record.amount.toFixed(2) }} USDT</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 在真实应用中，这个状态会从用户数据中获取
const userIsNode = ref(false); // 您可以切换这个值为 false 来查看申请页面

// 模拟的分红记录数据
const dividendRecords = reactive([
  { id: 1, amount: 120.50, date: '2025-09-25' },
  { id: 2, amount: 115.75, date: '2025-09-24' },
  { id: 3, amount: 130.00, date: '2025-09-23' },
]);
</script>