<template>
  <div class="space-y-6">
    <!-- 关键指标卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 总入金 -->
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm opacity-90">总入金</p>
          <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(globalStats.totalDepositedUsdt) }}</p>
        <p class="text-xs opacity-75 mt-2">USDT</p>
      </div>

      <!-- 总提现 -->
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm opacity-90">总提现</p>
          <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p class="text-3xl font-bold">{{ formatNumber(globalStats.totalWithdrawnHaf) }}</p>
        <p class="text-xs opacity-75 mt-2">HAF</p>
      </div>

      <!-- 活跃用户 -->
      <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm opacity-90">活跃用户</p>
          <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold">{{ globalStats.activeUsers }}</p>
        <p class="text-xs opacity-75 mt-2">用户</p>
      </div>

      <!-- 总订单数 -->
      <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm opacity-90">总订单数</p>
          <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-3xl font-bold">{{ globalStats.totalOrders }}</p>
        <p class="text-xs opacity-75 mt-2">订单</p>
      </div>
    </div>

    <!-- 合约余额 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
        <h3 class="text-lg font-bold mb-4 text-gray-800">合约余额</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div>
              <p class="text-sm text-gray-600">USDT 余额</p>
              <p class="text-2xl font-bold text-blue-600 mt-1">{{ formatNumber(globalStats.contractUsdtBalance) }}</p>
            </div>
            <img src="/icons/usdt.svg" alt="USDT" class="w-12 h-12" />
          </div>
          <div class="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
            <div>
              <p class="text-sm text-gray-600">HAF 余额</p>
              <p class="text-2xl font-bold text-purple-600 mt-1">{{ formatNumber(globalStats.contractHafBalance) }}</p>
            </div>
            <svg class="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 创世节点池 -->
      <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
        <h3 class="text-lg font-bold mb-4 text-gray-800">创世节点统计</h3>
        <div class="space-y-4">
          <div class="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <p class="text-sm text-gray-600">创世节点池</p>
            <p class="text-2xl font-bold text-green-600 mt-1">{{ formatNumber(globalStats.genesisPool) }} USDT</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <p class="text-xs text-gray-600">总节点数</p>
              <p class="text-xl font-bold text-blue-600 mt-1">{{ globalStats.totalGenesisNodes }}</p>
            </div>
            <div class="p-3 bg-green-50 rounded-lg">
              <p class="text-xs text-gray-600">活跃节点</p>
              <p class="text-xl font-bold text-green-600 mt-1">{{ activeNodes.length }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 额外统计 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h3 class="text-lg font-bold mb-4 text-gray-800">其他统计</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg text-center">
          <p class="text-sm text-gray-600">已完成订单</p>
          <p class="text-2xl font-bold text-blue-600 mt-2">{{ globalStats.completedOrders }}</p>
        </div>
        <div class="p-4 bg-green-50 rounded-lg text-center">
          <p class="text-sm text-gray-600">总分发HAF</p>
          <p class="text-2xl font-bold text-green-600 mt-2">{{ formatNumber(globalStats.totalHafDistributed) }}</p>
        </div>
        <div class="p-4 bg-purple-50 rounded-lg text-center">
          <p class="text-sm text-gray-600">总手续费</p>
          <p class="text-2xl font-bold text-purple-600 mt-2">{{ formatNumber(globalStats.totalFeeCollectedHaf) }}</p>
        </div>
        <div class="p-4 bg-orange-50 rounded-lg text-center">
          <p class="text-sm text-gray-600">当前HAF价格</p>
          <p class="text-2xl font-bold text-orange-600 mt-2">{{ formatPrice(globalStats.currentHafPrice) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminData } from '../../composables/useAdminData';

const {
  activeNodes,
  globalStats,
} = useAdminData();

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

const formatPrice = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(6);
};
</script>
