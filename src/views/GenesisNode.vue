<template>
  <div class="bg-gray-50 min-h-screen">
    <div class="bg-white p-4 flex items-center shadow-sm">
      <button @click="router.back()" class="mr-4 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 class="text-xl font-bold">{{ t('nodeCenter.title') }}</h2>
    </div>

    <!-- 申请页面 -->
    <div v-if="!userIsNode && !isPendingApproval" class="p-4">
      <div class="bg-white rounded-xl shadow-sm p-6 text-center">
        <img src="/icons/ecosystem.svg" class="w-20 h-20 mx-auto mb-4" alt="Genesis Node">
        <h3 class="text-2xl font-bold mb-2">{{ t('nodeCenter.applyTitle') }}</h3>
        <p class="text-gray-600 mb-4">{{ t('nodeCenter.applyDesc') }}</p>
        
        <!-- 费用显示 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p class="text-sm text-gray-600 mb-1">{{ t('nodeCenter.applicationFee') }}</p>
          <p class="text-3xl font-bold text-blue-600">{{ nodeCostDisplay }} USDT</p>
          <p class="text-xs text-gray-500 mt-2">{{ t('nodeCenter.yourBalance') }}: {{ usdtBalanceDisplay }} USDT</p>
        </div>
        
        <div class="text-left space-y-3 mb-8">
            <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">1</span>
                <p><span class="font-bold">{{ t('nodeCenter.condition') }}: </span>{{ t('nodeCenter.conditionDesc') }}</p>
            </div>
            <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">2</span>
                <p><span class="font-bold">{{ t('nodeCenter.rights') }}: </span>{{ t('nodeCenter.rightsDesc') }}</p>
            </div>
             <div class="flex items-start">
                <span class="bg-blue-500 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center font-bold mr-3 mt-1">3</span>
                <p><span class="font-bold">{{ t('nodeCenter.exit') }}: </span>{{ t('nodeCenter.exitDesc') }}</p>
            </div>
        </div>

        <button 
          @click="handleButtonClick"
          class="w-full text-white font-bold py-3 rounded-lg text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          :class="{
            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700': canApply && !isApproving && !isApplying,
            'bg-gradient-to-r from-blue-300 to-blue-400 cursor-not-allowed': !canApply || isApproving || isApplying
          }"
          :disabled="!canApply || isApproving || isApplying"
        >
          {{ buttonText }}
        </button>
      </div>
    </div>

    <!-- 待审核页面 -->
    <div v-else-if="isPendingApproval" class="p-4">
      <div class="bg-white rounded-xl shadow-sm p-6 text-center">
        <div class="w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-2xl font-bold mb-2">{{ t('nodeCenter.applicationSubmitted') }}</h3>
        <p class="text-gray-600 mb-4">{{ t('nodeCenter.pendingReview') }}</p>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm text-gray-700">{{ t('nodeCenter.reviewNote') }}</p>
        </div>
      </div>
    </div>

    <!-- 创世节点页面 -->
    <div v-else class="p-4">
      <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg">{{ t('nodeCenter.myDividends') }}</h3>
            <span class="bg-green-100 text-green-700 font-bold py-1 px-3 rounded-full text-sm">{{ t('nodeCenter.nodeActive') }}</span>
        </div>
        <div class="text-center mb-4">
            <p class="text-sm text-gray-500">{{ t('nodeCenter.totalReceived') }} (USDT)</p>
            <p class="text-4xl font-bold my-1">{{ withdrawnDividends }}</p>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 mb-1">
            <div class="bg-green-500 h-3 rounded-full" :style="{ width: dividendProgress + '%' }"></div>
        </div>
        <div class="text-xs text-gray-500 flex justify-between">
            <span>0</span>
            <span>{{ maxDividends }} USDT (3x)</span>
        </div>
      </div>

      <div>
        <h3 class="font-bold text-lg mb-3">{{ t('nodeCenter.dividendRecords') }}</h3>
        <div v-if="dividendRecords.length > 0" class="bg-white p-4 rounded-xl shadow-sm space-y-3">
          <div v-for="record in dividendRecords" :key="record.id" class="flex justify-between items-center">
            <div>
              <p class="font-semibold">{{ t('nodeCenter.dailyDividend') }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ record.date }}</p>
            </div>
            <p class="font-bold text-green-600">+{{ record.amount.toFixed(2) }} USDT</p>
          </div>
        </div>
        <div v-else class="bg-white p-8 rounded-xl shadow-sm text-center">
          <img src="/icons/no_data.png" class="w-20 h-20 mx-auto mb-3 opacity-50" alt="No data">
          <p class="text-gray-400">{{ t('nodeCenter.noRecords') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount, useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt } from '@wagmi/vue';
import { formatUnits, parseUnits, maxUint256 } from 'viem';
import abi from '../../contract/abi.json';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const router = useRouter();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as `0x${string}`;

// ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ========== 1. 获取创世节点费用 ==========
const { data: genesisNodeCost } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'genesisNodeCost',
});

const nodeCostDisplay = computed(() => {
  if (!genesisNodeCost.value) return '5000';
  return parseFloat(formatUnits(genesisNodeCost.value as bigint, 18)).toFixed(0);
});

// ========== 2. 获取用户信息 ==========
const userArgs = computed(() => address.value ? [address.value] as const : undefined);

const { data: userData, refetch: refetchUser } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// ========== 调试：读取用户订单 ==========
const { data: userOrdersData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getUserOrders',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// 用户是否是创世节点
const userIsNode = computed(() => {
  if (!userData.value) return false;
  return (userData.value as any).isGenesisNode; // ✅ 使用字段名访问
});

// 用户是否已质押
const hasStaked = computed(() => {
  if (!userData.value) return false;
  
  // 🔍 调试日志
  console.log('===== GenesisNode Debug =====');
  console.log('userData.value:', userData.value);
  console.log('Type of userData:', typeof userData.value);
  console.log('Is Array:', Array.isArray(userData.value));
  console.log('Keys:', Object.keys(userData.value || {}));
  console.log('userOrders:', userOrdersData.value);
  console.log('userOrders length:', Array.isArray(userOrdersData.value) ? userOrdersData.value.length : 'not array');
  
  const totalStaked = (userData.value as any).totalStakedAmount; // ✅ 使用字段名访问
  console.log('totalStakedAmount:', totalStaked);
  console.log('totalStakedAmount type:', typeof totalStaked);
  console.log('totalStakedAmount > 0:', totalStaked && totalStaked > 0n);
  
  // 方法1: 检查 totalStakedAmount
  const method1 = totalStaked && totalStaked > 0n;
  
  // 方法2: 检查是否有订单
  const hasOrders = userOrdersData.value && Array.isArray(userOrdersData.value) && userOrdersData.value.length > 0;
  console.log('Has orders:', hasOrders);
  
  console.log('Final result - method1:', method1, 'method2:', hasOrders);
  console.log('============================');
  
  // 使用订单数量作为判断依据（更可靠）
  return hasOrders || method1;
});

// ========== 3. 获取申请状态 ==========
const applicationArgs = computed(() => address.value ? [address.value] as const : undefined);

const { data: applicationPending } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'genesisNodeApplications',
  args: applicationArgs,
  query: {
    enabled: !!address.value,
  }
});

const isPendingApproval = computed(() => !!applicationPending.value);

// ========== 4. 已提取分红（从 users 读取）==========
// 已提取分红
const withdrawnDividends = computed(() => {
  if (!userData.value) return '0.00';
  const withdrawn = (userData.value as any).genesisDividendsWithdrawn; // ✅ 使用字段名访问
  if (!withdrawn) return '0.00';
  return parseFloat(formatUnits(withdrawn as bigint, 18)).toFixed(2);
});

// 最大分红额度 (3倍)
const maxDividends = computed(() => {
  return (parseFloat(nodeCostDisplay.value) * 3).toFixed(0);
});

// 分红进度百分比
const dividendProgress = computed(() => {
  const withdrawn = parseFloat(withdrawnDividends.value);
  const max = parseFloat(maxDividends.value);
  return max > 0 ? ((withdrawn / max) * 100).toFixed(1) : '0';
});

// ========== 5. 获取 USDT 余额 ==========
const { data: usdtBalance } = useBalance({
  address: address,
  token: USDT_ADDRESS,
  query: {
    enabled: !!address.value,
  }
});

const usdtBalanceDisplay = computed(() => {
  if (!usdtBalance.value) return '0.00';
  return parseFloat(formatUnits(usdtBalance.value.value, 18)).toFixed(2);
});

// ========== 6. USDT 授权检查 ==========
const allowanceArgs = computed(() => {
  if (!address.value) return undefined;
  return [address.value, CONTRACT_ADDRESS] as const;
});

const { data: allowance, refetch: refetchAllowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'allowance',
  args: allowanceArgs,
  query: {
    enabled: !!address.value,
    refetchInterval: 3000,
  }
});

const needsApproval = computed(() => {
  if (!address.value || !genesisNodeCost.value || !allowance.value) return true;
  return (allowance.value as bigint) < (genesisNodeCost.value as bigint);
});

// ========== 7. 授权 USDT ==========
const { data: approveHash, writeContract: approve, isPending: isApproving } = useWriteContract();

const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
  hash: approveHash,
});

const handleApprove = async () => {
  if (!address.value) return;

  try {
    console.log('📝 授权 USDT (无限)');
    await approve({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, maxUint256],
    });
  } catch (error: any) {
    console.error('Approve error:', error);
    toast.error(error.message || t('common.error'));
  }
};

watch(() => isApproveSuccess.value, (success) => {
  if (success) {
    toast.success(t('stakingPage.approveSuccess'));
    refetchAllowance();
  }
});

// ========== 8. 申请创世节点 ==========
const { data: applyHash, writeContract: apply, isPending: isApplying } = useWriteContract();

const { isSuccess: isApplySuccess } = useWaitForTransactionReceipt({
  hash: applyHash,
});

const handleApply = async () => {
  if (!address.value) return;

  try {
    console.log('📝 申请创世节点');
    await apply({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'applyForGenesisNode',
      args: [], // 无参数函数
    });
  } catch (error: any) {
    console.error('Apply error:', error);
    toast.error(error.message || t('common.error'));
  }
};

watch(() => isApplySuccess.value, (success) => {
  if (success) {
    toast.success(t('nodeCenter.applySuccess'));
    refetchUser();
  }
});

// ========== 9. 按钮状态 ==========
const canApply = computed(() => {
  if (!address.value) return false;
  if (!hasStaked.value) return false;
  if (userIsNode.value || isPendingApproval.value) return false;
  if (parseFloat(usdtBalanceDisplay.value) < parseFloat(nodeCostDisplay.value)) return false;
  return true;
});

const buttonText = computed(() => {
  if (!address.value) return t('common.connectWallet');
  if (!hasStaked.value) return t('nodeCenter.mustStakeFirst');
  if (userIsNode.value) return t('nodeCenter.alreadyNode');
  if (isPendingApproval.value) return t('nodeCenter.pendingApproval');
  if (parseFloat(usdtBalanceDisplay.value) < parseFloat(nodeCostDisplay.value)) {
    return t('nodeCenter.insufficientBalance');
  }
  if (needsApproval.value && !isApproving.value) return t('nodeCenter.approveUSDT');
  if (isApproving.value) return t('nodeCenter.approving');
  if (isApplying.value) return t('nodeCenter.applying');
  return t('nodeCenter.applyNow');
});

const handleButtonClick = () => {
  if (!canApply.value) return;
  if (needsApproval.value) {
    handleApprove();
  } else {
    handleApply();
  }
};

// 模拟的分红记录数据 (TODO: 从合约读取)
const dividendRecords = computed<Array<{ id: number; amount: number; date: string }>>(() => {
  // 这里应该从 getRewardRecords 读取创世节点分红记录
  // 暂时返回空数组
  return [];
});
</script>