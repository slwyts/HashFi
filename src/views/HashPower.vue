<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-20">
    <!-- 顶部标题 -->
    <div class="relative bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-b-3xl shadow-xl">
      <div class="flex items-center">
        <button @click="router.back()" class="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-white">算力中心</h1>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <!-- 算力信息卡片 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 class="text-lg font-bold text-gray-800 mb-4">我的算力</h2>
        
        <div class="grid grid-cols-2 gap-4">
          <!-- 当前算力 -->
          <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
            <p class="text-xs text-gray-600 mb-1">当前算力</p>
            <p class="text-2xl font-bold text-orange-600">{{ currentHashPower }}</p>
            <p class="text-xs text-gray-500 mt-1 font-bold">T</p>
          </div>

          <!-- 累计挖矿 -->
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
            <p class="text-xs text-gray-600 mb-1">累计挖矿</p>
            <p class="text-2xl font-bold text-blue-600">{{ formatBtc(totalMinedBtc) }}</p>
            <p class="text-xs text-gray-500 mt-1 font-bold">BTC</p>
          </div>

          <!-- 可提现 -->
          <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
            <p class="text-xs text-gray-600 mb-1">可提现</p>
            <p class="text-2xl font-bold text-green-600">{{ formatBtc(availableBtc) }}</p>
            <p class="text-xs text-gray-500 mt-1 font-bold">BTC</p>
          </div>

          <!-- 已提现 -->
          <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
            <p class="text-xs text-gray-600 mb-1">已提现</p>
            <p class="text-2xl font-bold text-purple-600">{{ formatBtc(withdrawnBtc) }}</p>
            <p class="text-xs text-gray-500 mt-1 font-bold">BTC</p>
          </div>
        </div>
      </div>

      <!-- BTC地址设置 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 class="text-lg font-bold text-gray-800 mb-4">BTC提现地址</h2>
        
        <div v-if="btcAddress && btcAddress !== '0x0000000000000000000000000000000000000000'" class="mb-4">
          <div class="bg-gray-50 p-4 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">当前地址</p>
            <p class="text-sm font-mono text-gray-800 break-all">{{ btcAddress }}</p>
          </div>
        </div>

        <div class="space-y-3">
          <input
            v-model="newBtcAddress"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
            :class="{ 'border-red-300 focus:ring-red-500': newBtcAddress && !isBtcAddressValid }"
            placeholder="输入BTC地址（如：bc1q...）"
          />
          
          <!-- BTC地址安全提示 -->
          <div class="bg-red-50 border border-red-200 rounded-xl p-3">
            <p class="text-xs text-red-800">
              <span class="font-semibold">⚠️ 重要提示：</span>
              <br/>HashFi仅支持通过Bitcoin主网地址进行提现，如果输入错误，本平台概不负责。
              <br/>支持的地址格式：1、3、bc1p、bc1q 开头的地址
            </p>
          </div>
          
          <!-- 地址格式错误提示 -->
          <div v-if="newBtcAddress && !isBtcAddressValid" class="text-xs text-red-600 flex items-center gap-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>请输入有效的Bitcoin主网地址（1、3、bc1p或bc1q开头）</span>
          </div>
          
          <button
            @click="handleSetBtcAddress"
            :disabled="isProcessing() || !newBtcAddress || !isBtcAddressValid"
            class="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {{ isProcessing() ? '处理中...' : '设置BTC地址' }}
          </button>
        </div>
      </div>

      <!-- BTC提现 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 class="text-lg font-bold text-gray-800 mb-4">申请提现</h2>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p class="text-xs text-yellow-800">
            <span class="font-semibold">提示：</span>
            <br/>• 最低提现金额：{{ minBtcWithdrawal.toFixed(8) }} BTC
            <br/>• 提现手续费：5%
            <br/>• 提现需要管理员审核通过后到账
          </p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-sm text-gray-600 mb-2 block">提现数量（BTC）</label>
            <input
              v-model="withdrawAmount"
              type="number"
              step="0.00000001"
              :min="minBtcWithdrawal"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-mono"
              placeholder="0.00000000"
            />
            <div class="flex justify-between mt-2 text-xs text-gray-500">
              <span>可提现：{{ formatBtc(availableBtc) }} BTC</span>
              <button @click="withdrawAmount = formatBtc(availableBtc)" class="text-orange-600 hover:text-orange-700 font-semibold">
                全部
              </button>
            </div>
          </div>

          <div v-if="withdrawAmount" class="bg-gray-50 p-4 rounded-xl">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-600">提现金额</span>
              <span class="font-mono">{{ withdrawAmount }} BTC</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-600">手续费 (5%)</span>
              <span class="font-mono text-red-600">-{{ (parseFloat(withdrawAmount || '0') * 0.05).toFixed(8) }} BTC</span>
            </div>
            <div class="border-t border-gray-200 my-2"></div>
            <div class="flex justify-between text-sm font-bold">
              <span class="text-gray-800">实际到账</span>
              <span class="font-mono text-green-600">{{ (parseFloat(withdrawAmount || '0') * 0.95).toFixed(8) }} BTC</span>
            </div>
          </div>

          <button
            @click="handleWithdrawBtc"
            :disabled="isProcessing() || !withdrawAmount || parseFloat(withdrawAmount) < minBtcWithdrawal || !btcAddress || btcAddress === '0x0000000000000000000000000000000000000000'"
            class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {{ isProcessing() ? '处理中...' : '申请提现' }}
          </button>
        </div>
      </div>

      <!-- 提现订单列表 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h2 class="text-lg font-bold text-gray-800 mb-4">我的提现订单</h2>
        
        <div v-if="!withdrawalOrders || withdrawalOrders.length === 0" class="text-center py-8 text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm">暂无提现记录</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(order, index) in withdrawalOrders"
            :key="index"
            class="border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-sm font-mono font-semibold text-gray-800">{{ formatBtc(order.amount) }} BTC</p>
                <p class="text-xs text-gray-500 mt-1">{{ formatTimestamp(order.timestamp) }}</p>
              </div>
              <span :class="[
                'px-3 py-1 rounded-full text-xs font-semibold',
                order.status === 0 ? 'bg-yellow-100 text-yellow-700' :
                order.status === 1 ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              ]">
                {{ order.status === 0 ? '待审核' : order.status === 1 ? '已通过' : '已拒绝' }}
              </span>
            </div>
            <div class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg font-mono break-all">
              {{ order.btcAddress }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAccount, useReadContract } from '@wagmi/vue';
import { useEnhancedContract } from '@/composables/useEnhancedContract';
import { abi } from '@/core/contract';
import { toast } from '@/composables/useToast';

const router = useRouter();
const { address } = useAccount();
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// 获取用户算力信息
const { data: hashPowerInfo, refetch: refetchHashPowerInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getUserHashPowerInfo',
  args: computed(() => address.value ? [address.value] : undefined),
  query: {
    enabled: () => !!address.value,
  },
});

// 获取最小提币数量
const { data: minBtcWithdrawalData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'minBtcWithdrawal',
});

const minBtcWithdrawal = computed(() => {
  if (!minBtcWithdrawalData.value) return 0.001; // 默认值
  return Number(minBtcWithdrawalData.value) / 1e8;
});

// 获取用户的提现订单
const { data: withdrawalOrdersData, refetch: refetchOrders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getBtcWithdrawalOrders',
  args: computed(() => address.value ? [address.value] : undefined),
  query: {
    enabled: () => !!address.value,
  },
});

// 解析算力信息
const currentHashPower = computed(() => {
  if (!hashPowerInfo.value) return '0';
  const info = hashPowerInfo.value as any;
  return info[0]?.toString() || '0';
});

const totalMinedBtc = computed(() => {
  if (!hashPowerInfo.value) return 0n;
  const info = hashPowerInfo.value as any;
  return info[1] || 0n;
});

const availableBtc = computed(() => {
  if (!hashPowerInfo.value) return 0n;
  const info = hashPowerInfo.value as any;
  return info[2] || 0n;
});

const withdrawnBtc = computed(() => {
  if (!hashPowerInfo.value) return 0n;
  const info = hashPowerInfo.value as any;
  return info[3] || 0n;
});

const btcAddress = computed(() => {
  if (!hashPowerInfo.value) return '';
  const info = hashPowerInfo.value as any;
  return info[4] || '';
});

// 解析提现订单（合约返回的是结构体数组）
const withdrawalOrders = computed(() => {
  if (!withdrawalOrdersData.value) return [];
  const data = withdrawalOrdersData.value as any[];
  
  // 直接使用结构体数组，每个元素是一个订单对象
  const orders = data.map((order: any) => ({
    orderId: Number(order.orderId || 0),
    user: order.user,
    btcAddress: order.btcAddress,
    amount: order.amount,
    timestamp: order.timestamp,
    status: Number(order.status),
  }));
  
  // 按时间倒序排列
  return orders.reverse();
});

// 表单数据
const newBtcAddress = ref('');
const withdrawAmount = ref('');

// BTC主网地址验证
const isBtcAddressValid = computed(() => {
  if (!newBtcAddress.value) return true; // 空值不显示错误
  
  const address = newBtcAddress.value.trim();
  
  // 检查是否以有效的主网前缀开头
  const validPrefixes = ['1', '3', 'bc1q', 'bc1p'];
  const hasValidPrefix = validPrefixes.some(prefix => address.startsWith(prefix));
  
  if (!hasValidPrefix) return false;
  
  // P2PKH地址 (以1开头)
  if (address.startsWith('1')) {
    return /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  }
  
  // P2SH地址 (以3开头)
  if (address.startsWith('3')) {
    return /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  }
  
  // Bech32地址 (以bc1q开头 - P2WPKH或P2WSH)
  if (address.startsWith('bc1q')) {
    return /^bc1q[a-z0-9]{38,58}$/.test(address);
  }
  
  // Taproot地址 (以bc1p开头 - P2TR)
  if (address.startsWith('bc1p')) {
    return /^bc1p[a-z0-9]{58}$/.test(address);
  }
  
  return false;
});

// 格式化BTC数量（8位小数）
const formatBtc = (amount: bigint) => {
  if (!amount) return '0.00000000';
  const btcValue = Number(amount) / 1e8;
  return btcValue.toFixed(8);
};

// 格式化时间戳
const formatTimestamp = (timestamp: bigint) => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 设置BTC地址
const handleSetBtcAddress = async () => {
  if (!newBtcAddress.value) {
    toast.error('请输入BTC地址');
    return;
  }

  // 使用更严格的BTC主网地址验证
  if (!isBtcAddressValid.value) {
    toast.error('请输入有效的Bitcoin主网地址（1、3、bc1p或bc1q开头）');
    return;
  }

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setBtcAddress',
      args: [newBtcAddress.value],
      operation: '正在设置BTC地址',
      successMessage: 'BTC地址设置成功',
      errorMessage: '设置失败',
      onConfirmed: async () => {
        newBtcAddress.value = '';
        await refetchHashPowerInfo();
      },
    },
    {}
  );
};

// 申请BTC提现
const handleWithdrawBtc = async () => {
  if (!withdrawAmount.value || parseFloat(withdrawAmount.value) < 0.001) {
    toast.error('最低提现金额为 0.001 BTC');
    return;
  }

  if (!btcAddress.value || btcAddress.value === '0x0000000000000000000000000000000000000000') {
    toast.error('请先设置BTC提现地址');
    return;
  }

  const amountInSatoshi = BigInt(Math.floor(parseFloat(withdrawAmount.value) * 1e8));
  
  if (amountInSatoshi > availableBtc.value) {
    toast.error('提现金额超过可用余额');
    return;
  }

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'withdrawBtc',
      args: [amountInSatoshi],
      operation: '正在提交提现申请',
      successMessage: '提现申请已提交，等待管理员审核',
      errorMessage: '提现申请失败',
      onConfirmed: async () => {
        withdrawAmount.value = '';
        await refetchHashPowerInfo();
        await refetchOrders();
      },
    },
    {}
  );
};

// 监听地址变化，自动填充当前BTC地址
watch(btcAddress, (newVal) => {
  if (newVal && newVal !== '0x0000000000000000000000000000000000000000') {
    newBtcAddress.value = newVal;
  }
}, { immediate: true });
</script>
