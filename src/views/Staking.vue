<template>
  <div class="p-4 bg-gray-50 text-gray-800 min-h-screen">
    <div class="relative w-full overflow-hidden rounded-lg mb-4">
      <img src="/banner_01.png" alt="Banner" class="w-full">
    </div>

    <BtcPoolStats />

    <div class="bg-white p-2 rounded-lg flex items-center text-sm mb-4 shadow-sm">
      <img src="/icons/notice.png" alt="notice icon" class="w-4 h-4 mr-2">
      <p class="flex-grow">重要公告：关于Aifeex升级AI-DeFi质押协议</p>
    </div>

    <div class="mb-6">
      <h2 class="text-lg font-bold mb-3">选择质押方案</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div 
          v-for="plan in stakingPlans" 
          :key="plan.name"
          @click="selectedPlan = plan"
          :class="[
            'p-3 rounded-lg border-2 cursor-pointer transition-all',
            selectedPlan.name === plan.name ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-400'
          ]"
        >
          <p class="font-bold text-base">{{ t(plan.name) }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ plan.amountRange }}</p>
          <p class="text-sm font-semibold text-blue-700 mt-2">{{ t('stakingPage.dailyRate') }} ≈ {{ plan.dailyRate }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ plan.multiplier }} {{ t('stakingPage.multiplier') }}</p>
        </div>
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <p class="font-semibold">{{ t('stakingPage.stakeTitle') }}</p>
        <div class="flex items-center text-sm text-blue-600 cursor-pointer">
          <span>{{ t('stakingPage.stakingRules') }}</span>
          <img src="/icons/link.svg" alt="link" class="w-2 h-4 ml-1" />
        </div>
      </div>

      <div class="bg-gray-100 p-3 rounded-lg">
        <div class="flex justify-between text-xs text-gray-500 mb-2">
          <p>{{ t('stakingPage.stake') }} USDT</p>
          <p>{{ t('stakingPage.balance') }}： 1,234.56 USDT</p>
        </div>
        <div class="flex items-center">
          <img src="/icons/usdt.svg" alt="USDT" class="w-6 h-6 mr-2" />
          <span class="font-semibold text-lg">USDT</span>
          <input 
            type="number" 
            v-model="stakeAmount"
            :placeholder="t('stakingPage.minStakeAmount', { amount: selectedPlan.minStake })" 
            class="flex-grow text-right bg-transparent text-lg font-semibold focus:outline-none"
          >
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-2">{{ t('stakingPage.minerFee') }}： 0.000077 BNB </p>

      <div class="flex items-center text-red-500 text-xs mt-4" v-if="stakeAmount && stakeAmount < selectedPlan.minStake">
        <img src="/icons/warn.svg" alt="warning" class="w-4 h-4 mr-1" />
        <p>{{ t('stakingPage.minStakeAmount', { amount: selectedPlan.minStake }) }}</p>
      </div>

      <button 
        class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        :disabled="!stakeAmount || stakeAmount < selectedPlan.minStake"
      >
        {{ t('stakingPage.stakeNow') }}
      </button>
    </div>

    <div class="mt-8">
      <div class="flex border-b">
        <button 
          @click="activeTab = 'current'"
          :class="['flex-1 py-2 text-center font-semibold', activeTab === 'current' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500']"
        >
          {{ t('stakingPage.currentStaking') }}
        </button>
        <button 
          @click="activeTab = 'eco'"
          :class="['flex-1 py-2 text-center font-semibold', activeTab === 'eco' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500']"
        >
          {{ t('stakingPage.ecoStaking') }}
        </button>
      </div>
      
      <div v-if="activeTab === 'current'" class="mt-4 space-y-3">
        <div 
          v-if="currentStakes.length > 0" 
          v-for="stake in currentStakes" 
          :key="stake.id" 
          @click="openOrderDetail(stake)" 
          class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
            <div class="flex justify-between items-center mb-3">
              <span class="font-bold">{{ t(stake.plan) }} - {{ stake.amount }} USDT</span>
              <span 
                :class="['px-2 py-0.5 text-xs rounded-full font-semibold', stake.status === '进行中' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600']"
              >
                {{ stake.status === '进行中' ? t('orderDetail.statusInProgress') : t('orderDetail.statusFinished') }}
              </span>
            </div>
            <div class="text-xs text-gray-600 space-y-2">
              <div class="flex justify-between">
                <span>{{ t('stakingPage.totalQuota') }} / {{ t('stakingPage.released') }}:</span>
                <span class="font-mono">{{ stake.totalQuota }} / {{ stake.released }} USDT</span>
              </div>
               <div class="flex justify-between">
                <span>{{ t('stakingPage.releasedHAF') }}:</span>
                <span class="font-mono">{{ stake.releasedHAF }} HAF</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('stakingPage.stakingTime') }}:</span>
                <span class="font-mono">{{ stake.time }}</span>
              </div>
            </div>
        </div>
        <div v-else class="text-center py-10">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24" />
          <p class="text-gray-400 mt-2">{{ t('stakingPage.noData') }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'eco'" class="text-center py-10">
        <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24" />
        <p class="text-gray-400 mt-2">{{ t('stakingPage.noData') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import BtcPoolStats from '@/components/BtcPoolStats.vue';
import { stakes } from '@/store/temp-orders';

const { t } = useI18n();
const router = useRouter();

// 质押方案数据
const stakingPlans = reactive([
  { name: 'stakingPage.bronze', amountRange: '100-499 USDT', dailyRate: '0.7%', multiplier: '1.5倍', minStake: 100 },
  { name: 'stakingPage.silver', amountRange: '500-999 USDT', dailyRate: '0.8%', multiplier: '2.0倍', minStake: 500 },
  { name: 'stakingPage.gold', amountRange: '1000-2999 USDT', dailyRate: '0.9%', multiplier: '2.5倍', minStake: 1000 },
  { name: 'stakingPage.diamond', amountRange: '≥ 3000 USDT', dailyRate: '1.0%', multiplier: '3.0倍', minStake: 3000 },
]);

// 从我们创建的临时仓库中获取订单列表
const currentStakes = stakes;

const selectedPlan = ref(stakingPlans[0]);
const stakeAmount = ref<number | null>(null);
const activeTab = ref('current');

// 页面跳转逻辑
const openOrderDetail = (order: any) => {
  router.push(`/staking/order/${order.id}`);
};
</script>

<style scoped>
/* You can add component-specific styles here if needed */
</style>c