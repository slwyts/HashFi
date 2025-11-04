<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl p-6 shadow-lg border-2 border-red-200">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-red-600">高级操作</h2>
          <p class="text-sm text-gray-600">这些操作具有高风险，请谨慎使用</p>
        </div>
      </div>

      <!-- 紧急提现 -->
      <div class="mb-6 p-5 bg-red-50 rounded-lg border border-red-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          紧急提现代币
        </h3>
        <p class="text-sm text-gray-600 mb-4">从合约中提取USDT或HAF到管理员地址</p>
        
        <div class="space-y-3">
          <div class="flex flex-col md:flex-row gap-3">
            <div class="w-full md:w-auto md:min-w-[140px]">
              <CustomSelect
                v-model="withdrawForm.token"
                :options="tokenOptions"
                placeholder="选择代币"
              />
            </div>
            <input
              v-model="withdrawForm.amount"
              type="number"
              step="0.01"
              class="flex-1 px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent min-w-0"
              placeholder="提现数量"
            />
            <button
              @click="handleEmergencyWithdraw"
              :disabled="isProcessing() || !withdrawForm.amount"
              class="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              提现
            </button>
          </div>
          <div class="flex items-start gap-2 p-3 bg-red-100 rounded-lg">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-xs text-red-700">
              <strong>警告：</strong>紧急提现将直接从合约余额中提取代币到管理员地址，可能影响系统正常运作。请确保有充分理由再执行此操作。
            </p>
          </div>
        </div>
      </div>

      <!-- 合约控制 -->
      <div class="p-5 bg-orange-50 rounded-lg border border-orange-200">
        <h3 class="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          合约开关控制
        </h3>
        <p class="text-sm text-gray-600 mb-4">暂停或恢复合约的所有用户操作</p>

        <div class="grid grid-cols-2 gap-4">
          <button
            @click="handlePauseContract"
            :disabled="isProcessing() || systemStatus.isPaused"
            class="py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>暂停合约</span>
            </div>
          </button>
          <button
            @click="handleUnpauseContract"
            :disabled="isProcessing() || !systemStatus.isPaused"
            class="py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>恢复合约</span>
            </div>
          </button>
        </div>

        <div class="mt-4 p-3 bg-orange-100 rounded-lg">
          <p class="text-xs text-orange-700 flex items-start gap-2">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>说明：</strong>暂停合约后，所有用户的质押、提现、申请创世节点等操作将被禁止。管理员功能不受影响。恢复合约后一切恢复正常。
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h3 class="text-lg font-bold mb-4 text-gray-800">系统信息</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-gray-600">合约地址</p>
          <p class="text-xs font-mono font-semibold text-blue-600 mt-1 break-all">{{ CONTRACT_ADDRESS }}</p>
        </div>
        <div class="p-4 bg-purple-50 rounded-lg">
          <p class="text-sm text-gray-600">USDT地址</p>
          <p class="text-xs font-mono font-semibold text-purple-600 mt-1 break-all">{{ USDT_ADDRESS }}</p>
        </div>
        <div class="p-4 bg-green-50 rounded-lg">
          <p class="text-sm text-gray-600">管理员地址</p>
          <p class="text-xs font-mono font-semibold text-green-600 mt-1 break-all">{{ ownerAddress || '加载中...' }}</p>
        </div>
        <div class="p-4 rounded-lg" :class="[
          systemStatus.isPaused ? 'bg-red-50' : 'bg-green-50'
        ]">
          <p class="text-sm text-gray-600">合约状态</p>
          <p :class="[
            'text-lg font-bold mt-1',
            systemStatus.isPaused ? 'text-red-600' : 'text-green-600'
          ]">
            {{ systemStatus.isPaused ? '⏸ 已暂停' : '▶ 运行中' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { parseEther } from 'viem';
import { useReadContract } from '@wagmi/vue';
import { useAdminData } from '../../composables/useAdminData';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import { abi } from '@/core/contract';
import CustomSelect from './CustomSelect.vue';
import type { SelectOption } from './CustomSelect.vue';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as `0x${string}`;

const {
  systemStatus,
  refreshSystemData,
  refetchStats,
} = useAdminData();

const { callContractWithRefresh, isProcessing } = useEnhancedContract();

// 获取owner地址
const { data: ownerAddress } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'owner',
});

const withdrawForm = ref({
  token: 'USDT',
  amount: '',
});

// 代币选项
const tokenOptions: SelectOption[] = [
  { value: 'USDT', label: 'USDT' },
  { value: 'HAF', label: 'HAF' },
];

const handleEmergencyWithdraw = async () => {
  if (!withdrawForm.value.amount) return;
  
  const tokenAddress = withdrawForm.value.token === 'USDT'
    ? USDT_ADDRESS
    : CONTRACT_ADDRESS;

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'emergencyWithdrawToken',
      args: [
        tokenAddress as `0x${string}`,
        parseEther(String(withdrawForm.value.amount)),
      ],
      operation: `正在提现 ${withdrawForm.value.amount} ${withdrawForm.value.token}`,
      successMessage: '紧急提现成功',
      errorMessage: '提现失败',
      onConfirmed: async () => {
        await refetchStats();
        withdrawForm.value.amount = '';
      },
    },
    {}
  );
};

const handlePauseContract = async () => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'pause',
      operation: '正在暂停合约',
      successMessage: '合约已暂停',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refreshSystemData();
      },
    },
    {}
  );
};

const handleUnpauseContract = async () => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'unpause',
      operation: '正在恢复合约',
      successMessage: '合约已恢复',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refreshSystemData();
      },
    },
    {}
  );
};
</script>
