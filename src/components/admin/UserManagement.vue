<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">用户管理</h2>
      
      <!-- 强制结算用户 -->
      <div class="mb-6 p-5 bg-blue-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">强制结算用户收益</h3>
        <p class="text-sm text-gray-600 mb-4">手动触发指定用户的收益结算，更新其所有订单的静态收益和创世节点分红</p>
        <div class="flex gap-3">
          <input
            v-model="settleUserAddress"
            type="text"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder="0x..."
          />
          <button
            @click="handleForceSettle"
            :disabled="isProcessing() || !settleUserAddress"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            结算
          </button>
        </div>
      </div>

      <!-- 设置用户团队等级 -->
      <div class="p-5 bg-purple-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">设置用户团队等级</h3>
        <p class="text-sm text-gray-600 mb-4">手动调整用户的团队等级（V0-V5），影响其静态收益加速</p>
        <div class="flex gap-3">
          <input
            v-model="teamLevelAddress"
            type="text"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
            placeholder="0x..."
          />
          <select
            v-model="teamLevel"
            class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            <option :value="0">V0 - 无加速</option>
            <option :value="1">V1 - 5% 加速</option>
            <option :value="2">V2 - 10% 加速</option>
            <option :value="3">V3 - 15% 加速</option>
            <option :value="4">V4 - 20% 加速</option>
            <option :value="5">V5 - 25% 加速</option>
          </select>
          <button
            @click="handleSetTeamLevel"
            :disabled="isProcessing() || !teamLevelAddress"
            class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            设置等级
          </button>
        </div>
        
        <!-- 团队等级说明 -->
        <div class="mt-4 p-3 bg-white rounded-lg">
          <p class="text-xs text-gray-500 mb-2 font-semibold">团队等级要求说明：</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-gray-100 rounded font-mono">V0</span>
              <span class="text-gray-600">无要求</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-blue-100 rounded font-mono">V1</span>
              <span class="text-gray-600">5,000 USDT 小区</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-green-100 rounded font-mono">V2</span>
              <span class="text-gray-600">20,000 USDT 小区</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-yellow-100 rounded font-mono">V3</span>
              <span class="text-gray-600">100,000 USDT 小区</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-orange-100 rounded font-mono">V4</span>
              <span class="text-gray-600">300,000 USDT 小区</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-red-100 rounded font-mono">V5</span>
              <span class="text-gray-600">1,000,000 USDT 小区</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户查询功能（可选扩展） -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h3 class="text-lg font-bold mb-4 text-gray-800">用户信息查询</h3>
      <p class="text-sm text-gray-600 mb-4">输入用户地址查看其详细信息</p>
      <div class="flex gap-3">
        <input
          v-model="queryAddress"
          type="text"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          placeholder="0x..."
        />
        <button
          @click="handleQueryUser"
          :disabled="isQuerying || !queryAddress"
          class="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          查询
        </button>
      </div>

      <!-- 查询结果显示 -->
      <div v-if="userInfo" class="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h4 class="font-semibold text-gray-800 mb-4">用户信息</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">地址</p>
            <p class="text-sm font-mono font-semibold text-gray-800 mt-1 truncate">{{ queryAddress }}</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">推荐人</p>
            <p class="text-sm font-mono font-semibold text-gray-800 mt-1 truncate">
              {{ userInfo.referrer || '无' }}
            </p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">团队等级</p>
            <p class="text-sm font-semibold text-blue-600 mt-1">V{{ userInfo.teamLevel }}</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">总投资额</p>
            <p class="text-sm font-semibold text-green-600 mt-1">{{ formatNumber(userInfo.totalStaked) }} USDT</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">团队业绩</p>
            <p class="text-sm font-semibold text-purple-600 mt-1">{{ formatNumber(userInfo.teamPerformance) }} USDT</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">直推人数</p>
            <p class="text-sm font-semibold text-orange-600 mt-1">{{ userInfo.directReferrals }} 人</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">订单数量</p>
            <p class="text-sm font-semibold text-blue-600 mt-1">{{ userInfo.orderCount }} 个</p>
          </div>
          <div class="p-3 bg-white rounded-lg">
            <p class="text-xs text-gray-500">创世节点</p>
            <p :class="[
              'text-sm font-semibold mt-1',
              userInfo.isGenesisNode ? 'text-green-600' : 'text-gray-400'
            ]">
              {{ userInfo.isGenesisNode ? '是' : '否' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatEther } from 'viem';
import { readContract } from '@wagmi/core';
import { useEnhancedContract } from '../../composables/useEnhancedContract';
import { wagmiConfig } from '../../core/web3';
import abi from '../../../contract/abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

const { callContractWithRefresh, isProcessing } = useEnhancedContract();

// 强制结算表单
const settleUserAddress = ref('');

// 团队等级表单
const teamLevelAddress = ref('');
const teamLevel = ref(0);

// 用户查询
const queryAddress = ref('');
const isQuerying = ref(false);
const userInfo = ref<any>(null);

const formatNumber = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

const handleForceSettle = async () => {
  if (!settleUserAddress.value) return;
  
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'forceSettleUser',
      args: [settleUserAddress.value as `0x${string}`],
      operation: '正在结算用户收益',
      successMessage: '结算成功',
      errorMessage: '结算失败',
      onConfirmed: async () => {
        settleUserAddress.value = '';
      },
    },
    {}
  );
};

const handleSetTeamLevel = async () => {
  if (!teamLevelAddress.value) return;
  
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setUserTeamLevel',
      args: [
        teamLevelAddress.value as `0x${string}`,
        teamLevel.value,
      ],
      operation: '正在设置团队等级',
      successMessage: '等级设置成功',
      errorMessage: '设置失败',
      onConfirmed: async () => {
        teamLevelAddress.value = '';
        teamLevel.value = 0;
      },
    },
    {}
  );
};

const handleQueryUser = async () => {
  if (!queryAddress.value) return;
  
  isQuerying.value = true;
  try {
    const data = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'getUserInfo',
      args: [queryAddress.value as `0x${string}`],
    });

    if (data) {
      const info = data as any;
      userInfo.value = {
        referrer: info[0].referrer === '0x0000000000000000000000000000000000000000' ? null : info[0].referrer,
        teamLevel: info[0].teamLevel,
        totalStaked: formatEther(info[0].totalStakedAmount),
        teamPerformance: formatEther(info[0].teamTotalPerformance),
        directReferrals: info[0].directReferrals.length,
        orderCount: info[0].orderIds.length,
        isGenesisNode: info[0].isGenesisNode,
      };
    }
  } catch (error) {
    console.error('Query error:', error);
  } finally {
    isQuerying.value = false;
  }
};
</script>
