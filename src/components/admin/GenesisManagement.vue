<template>
  <div class="space-y-6">
    <!-- 待审核申请 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">待审核申请</h2>
        <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
          {{ pendingApplications.length }} 待处理
        </span>
      </div>
      
      <div v-if="pendingApplications.length === 0" class="text-center py-12">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-gray-400 text-lg">暂无待审核申请</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="applicant in pendingApplications"
          :key="applicant"
          class="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-all"
        >
          <div class="flex-1">
            <p class="font-mono text-sm text-gray-800 font-semibold">{{ applicant }}</p>
            <p class="text-xs text-gray-500 mt-1">
              申请费用: <span class="font-semibold text-blue-600">{{ feeSettings.genesisNodeCost }} USDT</span>
            </p>
          </div>
          <div class="flex gap-3">
            <button
              @click="handleApprove(applicant)"
              :disabled="isProcessing()"
              class="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold"
            >
              通过
            </button>
            <button
              @click="handleReject(applicant)"
              :disabled="isProcessing()"
              class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创世节点列表 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h3 class="text-lg font-bold mb-4 text-gray-800">所有创世节点</h3>
      <div class="space-y-3">
        <div
          v-for="node in genesisNodesList"
          :key="node.address"
          class="p-4 rounded-lg border transition-all"
          :class="[
            node.isActive 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          ]"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                node.isActive ? 'bg-green-500' : 'bg-gray-400'
              ]"></div>
              <p class="font-mono text-sm font-semibold text-gray-800">{{ node.address }}</p>
            </div>
            <span :class="[
              'px-3 py-1 rounded-full text-xs font-semibold',
              node.isActive ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'
            ]">
              {{ node.isActive ? '活跃' : '已出局' }}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p class="text-gray-500">总分红</p>
              <p class="font-semibold text-gray-800">{{ formatNumber(node.totalDividend) }} USDT</p>
            </div>
            <div>
              <p class="text-gray-500">已领取</p>
              <p class="font-semibold text-blue-600">{{ formatNumber(node.withdrawn) }} USDT</p>
            </div>
            <div>
              <p class="text-gray-500">剩余</p>
              <p class="font-semibold text-green-600">{{ formatNumber(node.remaining) }} USDT</p>
            </div>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>进度</span>
              <span>{{ node.progress.toFixed(2) }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="h-2 rounded-full transition-all"
                :class="node.progress >= 100 ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-500 to-green-500'"
                :style="{ width: `${Math.min(node.progress, 100)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminData } from '../../composables/useAdminData';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import abi from '../../../contract/abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

const {
  pendingApplications,
  genesisNodesList,
  feeSettings,
  refreshGenesisData,
} = useAdminData();

const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

const handleApprove = async (applicant: string) => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'approveGenesisNode',
      args: [applicant as `0x${string}`],
      operation: '正在审批创世节点',
      successMessage: '审批成功',
      errorMessage: '审批失败',
      onConfirmed: async () => {
        await refreshGenesisData();
      },
    },
    {}
  );
};

const handleReject = async (applicant: string) => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'rejectGenesisNode',
      args: [applicant as `0x${string}`],
      operation: '正在拒绝申请',
      successMessage: '已拒绝申请',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refreshGenesisData();
      },
    },
    {}
  );
};
</script>
