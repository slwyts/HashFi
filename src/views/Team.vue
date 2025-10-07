<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen p-4">
    <!-- 邀请卡片 - 现代化渐变设计 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl mb-6 overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <div class="flex items-center mb-3">
          <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-lg">{{ t('teamPage.inviteTitle') }}</h3>
        </div>
        <div class="bg-white/15 backdrop-blur-sm p-4 rounded-xl flex justify-between items-center">
          <span class="text-sm font-mono truncate mr-4 opacity-90">https://hashfidefi.com/invite/{{ userAddress }}</span>
          <button class="bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors flex-shrink-0 shadow-lg">
            {{ t('teamPage.copy') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.totalMembers') }}</p>
        <p class="text-3xl font-bold text-gray-800">128</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.directReferrals') }}</p>
        <p class="text-3xl font-bold text-gray-800">15</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow col-span-2 border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.totalPerformance') }} (USDT)</p>
        <p class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">125,340.50</p>
      </div>
    </div>
    
    <!-- 团队等级卡片 -->
    <div class="bg-white p-6 rounded-2xl shadow-md mb-6 border border-gray-100">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg text-gray-800">{{ t('teamPage.teamLevel') }}</h3>
        <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-md">{{ teamLevel.current }}</span>
      </div>
      <div class="flex justify-between text-sm mb-3 text-gray-600">
        <p>{{ t('teamPage.largeDistrict') }}: <span class="font-semibold text-gray-800">80,100 USDT</span></p>
        <p>{{ t('teamPage.smallDistrict') }}: <span class="font-semibold text-gray-800">45,240.50 USDT</span></p>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-inner" :style="{ width: teamLevel.progress + '%' }"></div>
      </div>
      <div class="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
        {{ t('teamPage.nextLevelMsg', { amount: teamLevel.nextTarget - teamLevel.currentPerformance, level: teamLevel.next }) }}
      </div>
    </div>

    <!-- 团队成员列表 -->
    <div>
      <h3 class="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{{ t('teamPage.myTeam') }}</h3>
      <div class="bg-white p-5 rounded-2xl shadow-md border border-gray-100">
        <div v-if="teamMembers.length > 0" class="space-y-4">
          <div v-for="member in teamMembers" :key="member.address" class="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white mr-4 shadow-md">
              {{ member.address.substring(2, 4).toUpperCase() }}
            </div>
            <div class="flex-grow">
              <p class="font-semibold text-gray-800">{{ member.address }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ t('teamPage.joinTime') }}: {{ member.joinDate }}</p>
            </div>
            <div class="text-right">
              <span class="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-1">{{ member.level }}</span>
              <p class="text-sm font-semibold text-gray-600">{{ member.performance }} USDT</p>
            </div>
          </div>
        </div>
         <div v-else class="text-center py-12">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24 opacity-50" />
          <p class="text-gray-400 mt-3">{{ t('stakingPage.noData') }}</p>
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
  current: 'V2' as string,
  next: 'V3' as string,
  currentPerformance: 45240.50 as number, // 小区业绩
  nextTarget: 100000 as number,
  progress: computed((): number => (teamLevel.currentPerformance / teamLevel.nextTarget) * 100),
});

// 模拟团队成员数据
const teamMembers = reactive([
  { address: '0xabc...def', joinDate: '2025-09-24', level: '钻石', performance: 35000 },
  { address: '0x123...456', joinDate: '2025-09-23', level: '黄金', performance: 12000 },
  { address: '0x789...abc', joinDate: '2025-09-22', level: '白银', performance: 8000 },
  { address: '0x456...789', joinDate: '2025-09-21', level: '青铜', performance: 500 },
]);
</script>