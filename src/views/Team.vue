<template>
  <div class="bg-gray-50 min-h-screen p-4">
    <div class="bg-blue-600 text-white p-5 rounded-xl shadow-lg mb-6">
      <h3 class="font-bold text-lg mb-2">{{ t('teamPage.inviteTitle') }}</h3>
      <div class="bg-blue-700/80 p-3 rounded-lg flex justify-between items-center">
        <span class="text-sm font-mono truncate mr-4">https://hashfidefi.com/invite/{{ userAddress }}</span>
        <button class="bg-white text-blue-600 font-semibold py-1 px-3 rounded-md text-sm hover:bg-gray-100">
          {{ t('teamPage.copy') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <p class="text-sm text-gray-500">{{ t('teamPage.totalMembers') }}</p>
        <p class="text-2xl font-bold mt-1">128</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <p class="text-sm text-gray-500">{{ t('teamPage.directReferrals') }}</p>
        <p class="text-2xl font-bold mt-1">15</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm col-span-2">
        <p class="text-sm text-gray-500">{{ t('teamPage.totalPerformance') }} (USDT)</p>
        <p class="text-2xl font-bold mt-1">125,340.50</p>
      </div>
    </div>
    
    <div class="bg-white p-5 rounded-xl shadow-sm mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg">{{ t('teamPage.teamLevel') }}</h3>
        <span class="bg-blue-100 text-blue-700 font-bold py-1 px-3 rounded-full text-sm">{{ teamLevel.current }}</span>
      </div>
      <div class="flex justify-between text-sm mb-2">
        <p>{{ t('teamPage.largeDistrict') }}: <span class="font-semibold">80,100 USDT</span></p>
        <p>{{ t('teamPage.smallDistrict') }}: <span class="font-semibold">45,240.50 USDT</span></p>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div class="bg-blue-600 h-3 rounded-full" :style="{ width: teamLevel.progress + '%' }"></div>
      </div>
      <div class="text-xs text-gray-500 text-right">
        {{ t('teamPage.nextLevelMsg', { amount: teamLevel.nextTarget - teamLevel.currentPerformance, level: teamLevel.next }) }}
      </div>
    </div>

    <div>
      <h3 class="font-bold text-lg mb-3">{{ t('teamPage.myTeam') }}</h3>
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div v-if="teamMembers.length > 0" class="space-y-4">
          <div v-for="member in teamMembers" :key="member.address" class="flex items-center">
            <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-blue-600 mr-4">
              {{ member.address.substring(2, 4).toUpperCase() }}
            </div>
            <div class="flex-grow">
              <p class="font-semibold">{{ member.address }}</p>
              <p class="text-xs text-gray-500">{{ t('teamPage.joinTime') }}: {{ member.joinDate }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold">{{ member.level }}</p>
              <p class="text-xs text-gray-500">{{ member.performance }} USDT</p>
            </div>
          </div>
        </div>
         <div v-else class="text-center py-10">
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

const userAddress = ref('0x1a2b...c3d4');

// 模拟团队等级和业绩数据
const teamLevel = reactive({
  current: 'V2',
  next: 'V3',
  currentPerformance: 45240.50, // 小区业绩
  nextTarget: 100000,
  progress: computed(() => (teamLevel.currentPerformance / teamLevel.nextTarget) * 100),
});

// 模拟团队成员数据
const teamMembers = reactive([
  { address: '0xabc...def', joinDate: '2025-09-24', level: '钻石', performance: 35000 },
  { address: '0x123...456', joinDate: '2025-09-23', level: '黄金', performance: 12000 },
  { address: '0x789...abc', joinDate: '2025-09-22', level: '白银', performance: 8000 },
  { address: '0x456...789', joinDate: '2025-09-21', level: '青铜', performance: 500 },
]);
</script>