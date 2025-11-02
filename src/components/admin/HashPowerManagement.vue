<template>
  <div class="space-y-6">
    <!-- 算力统计概览 -->
    <div class="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 shadow-lg text-white">
      <h2 class="text-xl font-bold mb-4">算力中心概览</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p class="text-sm opacity-90 mb-1">全网总算力</p>
          <p class="text-3xl font-bold">{{ globalHashPower }}</p>
          <p class="text-xs opacity-75 mt-1">T</p>
        </div>
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p class="text-sm opacity-90 mb-1">待审核订单</p>
          <p class="text-3xl font-bold">{{ pendingOrders.length }}</p>
          <p class="text-xs opacity-75 mt-1">个</p>
        </div>
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p class="text-sm opacity-90 mb-1">总提现订单</p>
          <p class="text-3xl font-bold">{{ allOrders.length }}</p>
          <p class="text-xs opacity-75 mt-1">个</p>
        </div>
      </div>
    </div>

    <!-- 用户算力查询 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
      <h2 class="text-xl font-bold mb-4 text-gray-800">查询用户算力</h2>
      
      <div class="flex flex-col md:flex-row gap-3 mb-4">
        <input
          v-model="queryAddress"
          type="text"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
          placeholder="输入用户地址 0x..."
        />
        <button
          @click="handleQueryUser"
          :disabled="!queryAddress"
          class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          查询
        </button>
      </div>

      <div v-if="queriedUserInfo" class="p-5 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
        <h3 class="font-semibold text-gray-800 mb-4">用户算力信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white p-4 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">当前算力</p>
            <p class="text-2xl font-bold text-orange-600">{{ queriedUserInfo.hashPower }}</p>
            <p class="text-xs text-gray-500 mt-1">T</p>
          </div>
          <div class="bg-white p-4 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">累计挖矿</p>
            <p class="text-2xl font-bold text-blue-600">{{ queriedUserInfo.totalMined }}</p>
            <p class="text-xs text-gray-500 mt-1">BTC</p>
          </div>
          <div class="bg-white p-4 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">可提现</p>
            <p class="text-2xl font-bold text-green-600">{{ queriedUserInfo.available }}</p>
            <p class="text-xs text-gray-500 mt-1">BTC</p>
          </div>
          <div class="bg-white p-4 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">已提现</p>
            <p class="text-2xl font-bold text-purple-600">{{ queriedUserInfo.withdrawn }}</p>
            <p class="text-xs text-gray-500 mt-1">BTC</p>
          </div>
        </div>
        <div class="mt-4 bg-white p-4 rounded-lg">
          <p class="text-xs text-gray-500 mb-1">BTC地址</p>
          <p class="text-sm font-mono text-gray-800 break-all">{{ queriedUserInfo.btcAddress || '未设置' }}</p>
        </div>
      </div>
    </div>

    <!-- 更新用户算力 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-orange-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">算力管理</h2>
      
      <div class="p-5 bg-orange-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">更新用户算力</h3>
        <p class="text-sm text-gray-600 mb-4">为指定用户增加或减少算力（整数T），支持正数增加、负数减少</p>
        
        <div class="space-y-3">
          <input
            v-model="hashPowerAddress"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
            placeholder="输入用户地址 0x..."
          />
          
          <div class="flex flex-col sm:flex-row gap-3">
            <input
              v-model="hashPowerDelta"
              type="number"
              step="1"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-mono"
              placeholder="算力变动（支持负数）"
            />
            <button
              @click="handleUpdateHashPower"
              :disabled="isProcessing() || !hashPowerAddress || !hashPowerDelta"
              class="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              更新算力
            </button>
          </div>
        </div>

        <div class="mt-4 p-3 bg-white rounded-lg">
          <p class="text-xs text-gray-500 mb-2 font-semibold">操作说明：</p>
          <div class="text-xs text-gray-600 space-y-1">
            <p>• 输入正数：增加用户算力（如 +10 表示增加10T）</p>
            <p>• 输入负数：减少用户算力（如 -5 表示减少5T）</p>
            <p>• 算力单位：T（整数）</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置每日BTC产出 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">BTC产出设置</h2>
      
      <div class="p-5 bg-blue-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">设置每日BTC产出</h3>
        <p class="text-sm text-gray-600 mb-4">设置指定日期的全网BTC产出总量，将根据用户算力占比分配</p>
        
        <div class="space-y-3">
          <div>
            <label class="text-sm text-gray-600 mb-2 block">选择日期</label>
            <input
              v-model="btcOutputDate"
              type="date"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p v-if="existingBtcOutput !== null" class="text-xs text-blue-600 mt-2">
              该日期已设置产出：{{ formatBtc(existingBtcOutput) }} BTC
            </p>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3">
            <input
              v-model="btcOutputAmount"
              type="number"
              step="0.00000001"
              min="0"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
              placeholder="BTC产出数量"
            />
            <button
              @click="handleSetDailyBtcOutput"
              :disabled="isProcessing() || !btcOutputDate || !btcOutputAmount"
              class="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              设置产出
            </button>
          </div>
        </div>

        <div class="mt-4 p-3 bg-white rounded-lg">
          <p class="text-xs text-gray-500 mb-2 font-semibold">设置说明：</p>
          <div class="text-xs text-gray-600 space-y-1">
            <p>• 日期会自动对齐到UTC+8的当天00:00</p>
            <p>• BTC数量保留8位小数（satoshi精度）</p>
            <p>• 用户获得的BTC = 每日产出 × 用户算力 / 全网总算力</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 最小提币设置 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">提币参数设置</h2>
      
      <div class="p-5 bg-purple-50 rounded-lg">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">最小提币数量</h3>
        <p class="text-sm text-gray-600 mb-4">设置用户单次提币的最小数量限制</p>
        
        <div class="mb-4 p-3 bg-white rounded-lg">
          <p class="text-xs text-gray-500 mb-1">当前最小提币：</p>
          <p class="text-2xl font-bold text-purple-600 font-mono">{{ minBtcWithdrawalData ? formatBtc(minBtcWithdrawalData as bigint) : '0.00100000' }} BTC</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="newMinBtcWithdrawal"
            type="number"
            step="0.00000001"
            min="0.00000001"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono"
            placeholder="新的最小提币数量（BTC）"
          />
          <button
            @click="handleSetMinBtcWithdrawal"
            :disabled="isProcessing() || !newMinBtcWithdrawal"
            class="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
          >
            更新设置
          </button>
        </div>

        <div class="mt-4 p-3 bg-white rounded-lg">
          <p class="text-xs text-gray-500 mb-2 font-semibold">设置说明：</p>
          <div class="text-xs text-gray-600 space-y-1">
            <p>• 最小值必须大于0</p>
            <p>• BTC数量保留8位小数</p>
            <p>• 建议设置：0.001 BTC（避免小额频繁提币）</p>
          </div>
        </div>
      </div>
    </div>

    <!-- BTC提现审核 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-green-100">
      <h2 class="text-xl font-bold mb-6 text-gray-800">BTC提现审核</h2>
      
      <div class="mb-4 flex justify-between items-center">
        <p class="text-sm text-gray-600">待审核订单：{{ pendingOrders.length }} 个</p>
        <button
          @click="() => refetchPendingOrders()"
          class="text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          刷新
        </button>
      </div>

      <div v-if="!pendingOrders || pendingOrders.length === 0" class="text-center py-8 text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm">暂无待审核订单</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="order in pendingOrders"
          :key="order.orderId"
          class="border border-gray-200 rounded-xl p-4 hover:border-green-300 transition-colors"
        >
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800 mb-1">订单 #{{ order.orderId }}</p>
              <p class="text-xs text-gray-500 font-mono break-all mb-2">用户: {{ order.user }}</p>
              <p class="text-lg font-mono font-bold text-orange-600">{{ formatBtc(order.amount) }} BTC</p>
              <p class="text-xs text-gray-500 mt-1">{{ formatTimestamp(order.timestamp) }}</p>
            </div>
          </div>
          
          <div class="bg-gray-50 p-3 rounded-lg mb-3">
            <p class="text-xs text-gray-500 mb-1">BTC地址</p>
            <p class="text-xs text-gray-800 font-mono break-all">{{ order.btcAddress }}</p>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">提现金额</span>
              <span class="font-mono">{{ formatBtc(order.amount) }} BTC</span>
            </div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">手续费 (5%)</span>
              <span class="font-mono text-red-600">-{{ (Number(formatBtc(order.amount)) * 0.05).toFixed(8) }} BTC</span>
            </div>
            <div class="border-t border-yellow-300 my-2"></div>
            <div class="flex justify-between text-sm font-bold">
              <span class="text-gray-800">实际到账</span>
              <span class="font-mono text-green-600">{{ (Number(formatBtc(order.amount)) * 0.95).toFixed(8) }} BTC</span>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="handleProcessWithdrawal(order.orderId, false)"
              :disabled="isProcessing()"
              class="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              拒绝
            </button>
            <button
              @click="handleProcessWithdrawal(order.orderId, true)"
              :disabled="isProcessing()"
              class="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              通过
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史订单 -->
    <div class="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">历史订单</h2>
        <button
          @click="() => refetchAllOrders()"
          class="text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          刷新
        </button>
      </div>

      <!-- 筛选标签 -->
      <div class="flex gap-2 mb-4">
        <button
          @click="historyFilter = 'all'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            historyFilter === 'all' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          全部 ({{ filteredHistoryOrders.length }})
        </button>
        <button
          @click="historyFilter = 'approved'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            historyFilter === 'approved' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          已通过 ({{ approvedOrders.length }})
        </button>
        <button
          @click="historyFilter = 'rejected'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            historyFilter === 'rejected' 
              ? 'bg-red-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          已拒绝 ({{ rejectedOrders.length }})
        </button>
      </div>

      <div v-if="!filteredHistoryOrders || filteredHistoryOrders.length === 0" class="text-center py-8 text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm">暂无历史订单</p>
      </div>

      <div v-else class="space-y-3 max-h-[600px] overflow-y-auto">
        <div
          v-for="order in filteredHistoryOrders"
          :key="order.orderId"
          :class="[
            'border rounded-xl p-4 transition-colors',
            order.status === 1 ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'
          ]"
        >
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-semibold text-gray-800">订单 #{{ order.orderId }}</p>
                <span :class="[
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  order.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                ]">
                  {{ order.status === 1 ? '已通过' : '已拒绝' }}
                </span>
              </div>
              <p class="text-xs text-gray-500 font-mono break-all mb-2">用户: {{ order.user }}</p>
              <p class="text-lg font-mono font-bold" :class="order.status === 1 ? 'text-green-600' : 'text-red-600'">
                {{ formatBtc(order.amount) }} BTC
              </p>
              <p class="text-xs text-gray-500 mt-1">{{ formatTimestamp(order.timestamp) }}</p>
            </div>
          </div>
          
          <div class="bg-white p-3 rounded-lg mb-3">
            <p class="text-xs text-gray-500 mb-1">BTC地址</p>
            <p class="text-xs text-gray-800 font-mono break-all">{{ order.btcAddress }}</p>
          </div>

          <div v-if="order.status === 1" class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">提现金额</span>
              <span class="font-mono">{{ formatBtc(order.amount) }} BTC</span>
            </div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">手续费 (5%)</span>
              <span class="font-mono text-red-600">-{{ (Number(formatBtc(order.amount)) * 0.05).toFixed(8) }} BTC</span>
            </div>
            <div class="border-t border-green-300 my-2"></div>
            <div class="flex justify-between text-sm font-bold">
              <span class="text-gray-800">实际到账</span>
              <span class="font-mono text-green-600">{{ (Number(formatBtc(order.amount)) * 0.95).toFixed(8) }} BTC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useReadContract } from '@wagmi/vue';
import { useEnhancedContract } from '@/composables/useEnhancedContract';
import { abi } from '@/core/contract';
import { toast } from '@/composables/useToast';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

// 更新算力表单
const hashPowerAddress = ref('');
const hashPowerDelta = ref('');

// BTC产出表单
// 默认日期为今天（格式：YYYY-MM-DD），使用本地时区
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const btcOutputDate = ref(getLocalDateString());
const btcOutputAmount = ref('');
const existingBtcOutput = ref<bigint | null>(null);

// 最小提币设置
const newMinBtcWithdrawal = ref('');

// 历史订单筛选
const historyFilter = ref<'all' | 'approved' | 'rejected'>('all');

// 用户查询表单
const queryAddress = ref('');
const queriedUserInfo = ref<any>(null);

// 获取全网总算力
const { data: globalHashPowerData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'globalTotalHashPower',
});

const globalHashPower = computed(() => {
  if (!globalHashPowerData.value) return '0';
  return globalHashPowerData.value.toString();
});

// 获取最小提币数量
const { data: minBtcWithdrawalData, refetch: refetchMinBtc } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'minBtcWithdrawal',
});

// 获取所有提现订单（使用特殊地址 address(0)）
const ALL_ORDERS_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const { data: allOrdersData, refetch: refetchAllOrders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getBtcWithdrawalOrders',
  args: [ALL_ORDERS_ADDRESS],
});

const allOrders = computed(() => {
  if (!allOrdersData.value) return [];
  const data = allOrdersData.value as any[];
  
  // 解析为订单对象数组
  return data.map((order: any) => ({
    orderId: Number(order.orderId || 0),
    user: order.user,
    btcAddress: order.btcAddress,
    amount: order.amount,
    timestamp: order.timestamp,
    status: Number(order.status),
  }));
});

// 已通过的订单
const approvedOrders = computed(() => {
  return allOrders.value.filter(order => order.status === 1);
});

// 已拒绝的订单
const rejectedOrders = computed(() => {
  return allOrders.value.filter(order => order.status === 2);
});

// 历史订单（已通过+已拒绝，不包括待审核）
const historyOrders = computed(() => {
  return allOrders.value.filter(order => order.status !== 0);
});

// 根据筛选条件过滤历史订单
const filteredHistoryOrders = computed(() => {
  if (historyFilter.value === 'all') {
    return historyOrders.value;
  } else if (historyFilter.value === 'approved') {
    return approvedOrders.value;
  } else {
    return rejectedOrders.value;
  }
});

// 获取待审核的提现订单（使用特殊地址 address(1)）
const PENDING_ORDERS_ADDRESS = '0x0000000000000000000000000000000000000001' as `0x${string}`;

const { data: pendingOrdersData, refetch: refetchPendingOrders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getBtcWithdrawalOrders',
  args: [PENDING_ORDERS_ADDRESS],
});

// 解析待审核订单（合约返回的是结构体数组）
const pendingOrders = computed(() => {
  if (!pendingOrdersData.value) return [];
  const data = pendingOrdersData.value as any[];
  
  // 直接使用结构体数组，每个元素是一个订单对象
  return data.map((order: any) => ({
    orderId: Number(order.orderId || 0),
    user: order.user,
    btcAddress: order.btcAddress,
    amount: order.amount,
    timestamp: order.timestamp,
    status: Number(order.status),
  }));
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

// 监听日期变化，查询已有的BTC产出
watch(btcOutputDate, async (newDate) => {
  if (!newDate) {
    existingBtcOutput.value = null;
    btcOutputAmount.value = '';
    return;
  }

  try {
    const { readContract } = await import('@wagmi/core');
    const { wagmiConfig } = await import('@/core/web3');

    // 将日期字符串转换为 UTC+8 的 00:00:00 对应的 UTC 时间戳
    // 例如：2025-11-03 应该转换为 2025-11-03 00:00:00 UTC+8 = 2025-11-02 16:00:00 UTC
    const parts = newDate.split('-').map(Number);
    const year = parts[0]!;
    const month = parts[1]!;
    const day = parts[2]!;
    const utc8Midnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const utc8Offset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const utcTimestamp = Math.floor((utc8Midnight.getTime() - utc8Offset) / 1000);
    const dateTimestamp = BigInt(utcTimestamp);
    
    console.log('Query date:', newDate, 'timestamp:', dateTimestamp.toString());
    
    // 查询该日期的产出记录
    const data = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'dailyBtcOutputs',
      args: [dateTimestamp],
    });

    if (data) {
      const output = data as any;
      // DailyBtcOutput 结构: (date, btcAmount, totalHashPower)
      const btcAmount = output[1] || 0n;
      
      if (btcAmount > 0n) {
        existingBtcOutput.value = btcAmount;
        // 自动填充到输入框
        btcOutputAmount.value = formatBtc(btcAmount);
      } else {
        existingBtcOutput.value = null;
        btcOutputAmount.value = '';
      }
    }
  } catch (error) {
    console.error('Query daily output error:', error);
    existingBtcOutput.value = null;
  }
}, { immediate: true }); // 立即执行一次，初始化时自动查询今天的产出

// 更新用户算力
const handleUpdateHashPower = async () => {
  if (!hashPowerAddress.value) {
    toast.error('请输入用户地址');
    return;
  }

  if (!hashPowerDelta.value || hashPowerDelta.value === '0') {
    toast.error('请输入算力变动量');
    return;
  }

  const delta = BigInt(hashPowerDelta.value);

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'updateHashPower',
      args: [hashPowerAddress.value as `0x${string}`, delta],
      operation: '正在更新算力',
      successMessage: '算力更新成功',
      errorMessage: '算力更新失败',
      onConfirmed: async () => {
        hashPowerAddress.value = '';
        hashPowerDelta.value = '';
      },
    },
    {}
  );
};

// 查询用户算力信息
const handleQueryUser = async () => {
  if (!queryAddress.value) {
    toast.error('请输入用户地址');
    return;
  }

  try {
    const { readContract } = await import('@wagmi/core');
    const { wagmiConfig } = await import('@/core/web3');

    const data = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'getUserHashPowerInfo',
      args: [queryAddress.value as `0x${string}`],
    });

    if (data) {
      const info = data as any;
      queriedUserInfo.value = {
        hashPower: info[0]?.toString() || '0',
        totalMined: formatBtc(info[1] || 0n),
        available: formatBtc(info[2] || 0n),
        withdrawn: formatBtc(info[3] || 0n),
        btcAddress: info[4] || '',
      };
    }
  } catch (error) {
    console.error('Query error:', error);
    toast.error('查询失败');
    queriedUserInfo.value = null;
  }
};

// 设置每日BTC产出
const handleSetDailyBtcOutput = async () => {
  if (!btcOutputDate.value) {
    toast.error('请选择日期');
    return;
  }

  if (btcOutputAmount.value === '' || btcOutputAmount.value === null) {
    toast.error('请输入BTC产出数量');
    return;
  }

  // 将日期转换为时间戳
  const dateTimestamp = BigInt(new Date(btcOutputDate.value).getTime() / 1000);
  const amountInSatoshi = BigInt(Math.floor(parseFloat(btcOutputAmount.value) * 1e8));

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setDailyBtcOutput',
      args: [dateTimestamp, amountInSatoshi],
      operation: '正在设置BTC产出',
      successMessage: 'BTC产出设置成功',
      errorMessage: '设置失败',
      onConfirmed: async () => {
        btcOutputDate.value = '';
        btcOutputAmount.value = '';
      },
    },
    {}
  );
};

// 设置最小提币数量
const handleSetMinBtcWithdrawal = async () => {
  if (!newMinBtcWithdrawal.value) {
    toast.error('请输入最小提币数量');
    return;
  }

  const minAmount = parseFloat(newMinBtcWithdrawal.value);
  if (minAmount <= 0) {
    toast.error('最小提币数量必须大于0');
    return;
  }

  const amountInSatoshi = BigInt(Math.floor(minAmount * 1e8));

  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'setMinBtcWithdrawal',
      args: [amountInSatoshi],
      operation: '正在设置最小提币数量',
      successMessage: '最小提币数量设置成功',
      errorMessage: '设置失败',
      onConfirmed: async () => {
        newMinBtcWithdrawal.value = '';
        await refetchMinBtc();
      },
    },
    {}
  );
};

// 审核BTC提现
const handleProcessWithdrawal = async (orderId: number, approved: boolean) => {
  await callContractWithRefresh(
    {
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'processBtcWithdrawal',
      args: [BigInt(orderId), approved],
      operation: approved ? '正在通过提现申请' : '正在拒绝提现申请',
      successMessage: approved ? '提现已通过' : '提现已拒绝',
      errorMessage: '操作失败',
      onConfirmed: async () => {
        await refetchPendingOrders();
        await refetchAllOrders();
      },
    },
    {}
  );
};
</script>
