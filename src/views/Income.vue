<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen">
    <!-- 顶部收益卡片 - 现代化蓝色渐变 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-b-3xl shadow-xl mb-6 overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <p class="text-sm opacity-90 mb-2">{{ t('incomePage.totalIncome') }} (HAF)</p>
        <p class="text-5xl font-bold mb-8 tracking-tight">1,830.50</p>
        
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">35.12</p>
            <p class="text-xs opacity-90">{{ t('incomePage.todayIncome') }}</p>
          </div>
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">1,205.40</p>
            <p class="text-xs opacity-90">{{ t('incomePage.staticIncome') }}</p>
          </div>
          <div class="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <p class="text-2xl font-bold mb-1">625.10</p>
            <p class="text-xs opacity-90">{{ t('incomePage.dynamicIncome') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="px-4">
      <h3 class="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
        {{ t('incomePage.incomeRecords') }}
      </h3>
      
      <!-- 现代化标签页 -->
      <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key as RecordType | 'all'"
          :class="[
            'flex-1 py-2.5 text-center font-semibold transition-all duration-200 rounded-lg text-sm',
            activeTab === tab.key 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ t(tab.name) }}
        </button>
      </div>

      <div class="space-y-3 pb-6">
        <div 
          v-for="record in filteredRecords" 
          :key="record.id" 
          class="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
        >
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-800">{{ t(getRecordTypeName(record.type)) }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ record.date }}</p>
              </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600 text-lg">+{{ record.amount.toFixed(4) }} HAF</p>
                <p class="text-xs text-gray-500 mt-0.5">≈ ${{ (record.amount * hafPrice).toFixed(4) }}</p>
            </div>
          </div>
        </div>
        
        <div v-if="filteredRecords.length === 0" class="text-center py-10">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24" />
          <p class="text-gray-400 mt-2">{{ t('stakingPage.noData') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

type RecordType = 'static' | 'direct' | 'share' | 'team';

interface IncomeRecord {
  id: number;
  type: RecordType;
  amount: number;
  date: string;
}

// 模拟数据
const hafPrice = ref(1.5); // 假设HAF的当前价格
const activeTab = ref<RecordType | 'all'>('all');

const tabs = reactive([
  { key: 'all', name: 'incomePage.tabs.all' },
  { key: 'static', name: 'incomePage.tabs.static' },
  { key: 'direct', name: 'incomePage.tabs.direct' },
  { key: 'share', name: 'incomePage.tabs.share' },
  { key: 'team', name: 'incomePage.tabs.team' },
]);

const incomeRecords = reactive<IncomeRecord[]>([
  { id: 1, type: 'static', amount: 10.50, date: '2025-09-25 00:00' },
  { id: 2, type: 'direct', amount: 24.62, date: '2025-09-24 18:10' },
  { id: 3, type: 'static', amount: 10.50, date: '2025-09-24 00:00' },
  { id: 4, type: 'share', amount: 5.88, date: '2025-09-23 15:25' },
  { id: 5, type: 'team', amount: 100.00, date: '2025-09-23 12:00' },
  { id: 6, type: 'static', amount: 10.50, date: '2025-09-23 00:00' },
]);

const filteredRecords = computed(() => {
  if (activeTab.value === 'all') {
    return incomeRecords;
  }
  return incomeRecords.filter(record => record.type === activeTab.value);
});

const getRecordTypeName = (type: RecordType) => {
    const typeMap = {
        static: 'incomePage.types.static',
        direct: 'incomePage.types.direct',
        share: 'incomePage.types.share',
        team: 'incomePage.types.team',
    };
    return typeMap[type];
}
</script>