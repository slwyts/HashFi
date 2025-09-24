<template>
  <div class="bg-white min-h-screen">
    <div class="bg-blue-600 text-white p-6 rounded-b-3xl">
      <p class="text-sm opacity-80 mb-2">{{ t('incomePage.totalIncome') }} (HAF)</p>
      <p class="text-4xl font-bold mb-6">1,830.50</p>
      <div class="grid grid-cols-3 text-center gap-4">
        <div>
          <p class="text-lg font-semibold">35.12</p>
          <p class="text-xs opacity-80">{{ t('incomePage.todayIncome') }}</p>
        </div>
        <div>
          <p class="text-lg font-semibold">1,205.40</p>
          <p class="text-xs opacity-80">{{ t('incomePage.staticIncome') }}</p>
        </div>
        <div>
          <p class="text-lg font-semibold">625.10</p>
          <p class="text-xs opacity-80">{{ t('incomePage.dynamicIncome') }}</p>
        </div>
      </div>
    </div>

    <div class="p-4">
      <h3 class="text-lg font-bold mb-3">{{ t('incomePage.incomeRecords') }}</h3>
      
      <div class="flex border-b mb-4">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-1 py-2 text-center font-semibold transition-colors', activeTab === tab.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500']"
        >
          {{ t(tab.name) }}
        </button>
      </div>

      <div class="space-y-3">
        <div v-for="record in filteredRecords" :key="record.id" class="bg-gray-100/60 p-3 rounded-lg">
          <div class="flex justify-between items-center">
            <div>
              <p class="font-semibold">{{ t(getRecordTypeName(record.type)) }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ record.date }}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-green-600">+{{ record.amount.toFixed(4) }} HAF</p>
                <p class="text-xs text-gray-500 mt-1">≈ ${{ (record.amount * hafPrice).toFixed(4) }}</p>
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