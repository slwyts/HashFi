<template>
  <div class="p-6 min-h-screen">
    <!-- Banner with modern overlay -->
    <div class="relative w-full overflow-hidden rounded-2xl mb-6 shadow-xl">
      <img src="/banner_01.png" alt="Banner" class="w-full">
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
    </div>

    <BtcPoolStats />

    <!-- Notice Card with gradient accent -->
    <div class="card p-4 flex items-center text-sm mb-6 border-l-4 border-blue-500">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 flex-shrink-0">
        <img src="/icons/notice.png" alt="notice icon" class="w-5 h-5 invert brightness-0" style="filter: brightness(0) invert(1);">
      </div>
      <p class="flex-grow text-gray-700">重要公告：关于Aifeex升级AI-DeFi质押协议</p>
    </div>

    <!-- Staking Plans -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4 gradient-text">选择认购方案</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          v-for="plan in stakingPlans" 
          :key="plan.name"
          @click="selectedPlan = plan"
          :class="[
            'card p-4 cursor-pointer transition-all duration-300 relative overflow-hidden',
            selectedPlan && selectedPlan.name === plan.name 
              ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50 scale-105' 
              : 'hover:shadow-lg hover:scale-102'
          ]"
        >
          <!-- Selected indicator -->
          <div 
            v-if="selectedPlan && selectedPlan.name === plan.name"
            class="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-blue-500 border-l-[40px] border-l-transparent"
          >
            <svg class="w-4 h-4 text-white absolute -top-9 -right-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          
          <p class="font-bold text-lg mb-1">{{ t(plan.name) }}</p>
          <p class="text-xs text-gray-500 mb-3">{{ plan.amountRange }}</p>
          <p class="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {{ t('stakingPage.dailyRate') }} ≈ {{ plan.dailyRate }}
          </p>
          <p class="text-xs text-gray-500">{{ plan.multiplier }} {{ t('stakingPage.multiplier') }}</p>
        </div>
      </div>
    </div>

    <!-- Stake Input Card -->
    <div class="card p-6 mb-6">
      <div class="flex justify-between items-center mb-6">
        <p class="font-bold text-lg">{{ t('stakingPage.stakeTitle') }}</p>
        <div class="flex items-center text-sm text-blue-600 cursor-pointer hover:text-blue-700 transition-colors">
          <span>{{ t('stakingPage.stakingRules') }}</span>
          <img src="/icons/link.svg" alt="link" class="w-3 h-4 ml-1" />
        </div>
      </div>

      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
        <div class="flex justify-between text-xs text-gray-600 mb-3">
          <p class="font-medium">{{ t('stakingPage.stake') }} USDT</p>
          <p class="truncate ml-2">{{ t('stakingPage.balance') }}： <span class="font-semibold text-blue-600">{{ usdtBalance }} USDT</span></p>
        </div>
        <div class="flex items-center bg-white rounded-lg p-3">
          <img src="/icons/usdt.svg" alt="USDT" class="w-8 h-8 mr-3" />
          <span class="font-bold text-lg text-gray-700">USDT</span>
          <input 
            type="number" 
            v-model="stakeAmount"
            :placeholder="`${selectedPlan?.minStake || 100}+`" 
            class="flex-grow text-right bg-transparent text-xl font-bold text-gray-800 focus:outline-none placeholder-gray-400"
          >
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-3">{{ t('stakingPage.minerFee') }}： <span class="font-mono">~0.0001</span></p>

      <div class="flex items-center text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-lg" v-if="stakeAmount && stakeAmount < (selectedPlan?.minStake ?? 0)">
        <img src="/icons/warn.svg" alt="warning" class="w-5 h-5 mr-2" />
        <p>{{ t('stakingPage.minStakeAmount', { amount: selectedPlan?.minStake }) }}</p>
      </div>

      <button 
        @click="handleStake"
        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl mt-6 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:from-blue-200 disabled:to-blue-300 disabled:cursor-not-allowed disabled:opacity-80 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
        :disabled="!address || !stakeAmount || stakeAmount < (selectedPlan?.minStake ?? 0) || isProcessing"
      >
        {{ buttonText }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="card overflow-hidden mb-6">
      <div class="flex border-b border-gray-200">
        <button 
          @click="activeTab = 'current'"
          :class="[
            'flex-1 py-4 text-center font-bold transition-all duration-300 relative',
            activeTab === 'current' 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ t('stakingPage.currentStaking') }}
          <div 
            v-if="activeTab === 'current'"
            class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"
          ></div>
        </button>
        <button 
          @click="activeTab = 'eco'"
          :class="[
            'flex-1 py-4 text-center font-bold transition-all duration-300 relative',
            activeTab === 'eco' 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ t('stakingPage.ecoStaking') }}
          <div 
            v-if="activeTab === 'eco'"
            class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"
          ></div>
        </button>
      </div>
      
      <div v-if="activeTab === 'current'" class="p-4 space-y-4">
        <template v-if="currentStakes.length > 0">
          <div 
            v-for="stake in currentStakes" 
            :key="stake.id" 
            @click="openOrderDetail(stake)" 
            class="card p-5 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-300"
          >
            <div class="flex justify-between items-center mb-4">
              <span class="font-bold text-lg">{{ t(stake.plan) }} - <span class="text-blue-600">{{ stake.amount }} USDT</span></span>
              <span 
                :class="[
                  'px-3 py-1 text-xs rounded-full font-bold',
                  stake.status === '进行中' 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/50' 
                    : 'bg-gray-200 text-gray-600'
                ]"
              >
                {{ stake.status === '进行中' ? t('orderDetail.statusInProgress') : t('orderDetail.statusFinished') }}
              </span>
            </div>
            <div class="text-sm text-gray-600 space-y-3 bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ t('stakingPage.totalQuota') }} / {{ t('stakingPage.released') }}:</span>
                <span class="font-mono font-semibold text-gray-800">{{ stake.totalQuota }} / {{ stake.released }} USDT</span>
              </div>
               <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ t('stakingPage.releasedHAF') }}:</span>
                <span class="font-mono font-semibold text-gray-800">{{ stake.releasedHAF }} HAF</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-500">{{ t('stakingPage.stakingTime') }}:</span>
                <span class="font-mono text-gray-800">{{ stake.time }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center py-16">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-32 h-32 opacity-50" />
          <p class="text-gray-400 mt-4 text-lg">{{ t('stakingPage.noData') }}</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'eco'" class="p-4 text-center py-16">
        <img src="/icons/no_data.png" alt="No data" class="mx-auto w-32 h-32 opacity-50" />
        <p class="text-gray-400 mt-4 text-lg">{{ t('stakingPage.noData') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAccount, useReadContract, useWriteContract, useBalance, useWaitForTransactionReceipt } from '@wagmi/vue';
import { formatEther, formatUnits, parseEther, parseUnits, maxUint256 } from 'viem';
import BtcPoolStats from '@/components/BtcPoolStats.vue';
import abi from '../../contract/abi.json';
import { toast } from '@/composables/useToast';

const { t } = useI18n();
const router = useRouter();
const { address } = useAccount();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as `0x${string}`;

// ERC20 ABI (只需要 approve 和 allowance)
const erc20Abi = [
  {
    "inputs": [{"internalType": "address","name": "spender","type": "address"},{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "owner","type": "address"},{"internalType": "address","name": "spender","type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 质押方案数据
const stakingPlans = reactive([
  { name: 'stakingPage.bronze', amountRange: '100-499 USDT', dailyRate: '0.7%', multiplier: '1.5倍', minStake: 100 },
  { name: 'stakingPage.silver', amountRange: '500-999 USDT', dailyRate: '0.8%', multiplier: '2.0倍', minStake: 500 },
  { name: 'stakingPage.gold', amountRange: '1000-2999 USDT', dailyRate: '0.9%', multiplier: '2.5倍', minStake: 1000 },
  { name: 'stakingPage.diamond', amountRange: '≥ 3000 USDT', dailyRate: '1.0%', multiplier: '3.0倍', minStake: 3000 },
]);

const selectedPlan = ref(stakingPlans[0]);
const stakeAmount = ref<number | null>(null);
const activeTab = ref('current');
const isProcessing = ref(false);

// 读取 USDT 余额
const { data: usdtBalanceData, refetch: refetchUsdtBalance } = useBalance({
  address: address.value,
  token: USDT_ADDRESS,
  query: {
    enabled: !!address.value,
  },
});

// 读取用户信息
const { data: userInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: address.value ? [address.value] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 读取用户质押订单
const { data: userOrdersData, refetch: refetchOrders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getUserStakingOrders',
  args: address.value ? [address.value] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 读取 USDT 授权额度
const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: erc20Abi,
  functionName: 'allowance',
  args: address.value ? [address.value, CONTRACT_ADDRESS] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 写合约
const { writeContractAsync } = useWriteContract();

// USDT 余额（格式化）
const usdtBalance = computed(() => {
  if (!usdtBalanceData.value) return '0.00';
  return Number(formatEther(usdtBalanceData.value.value)).toFixed(2);
});

// 用户质押订单列表
const currentStakes = computed(() => {
  if (!userOrdersData.value || !Array.isArray(userOrdersData.value)) return [];
  
  return (userOrdersData.value as any[]).map((order, index) => {
    const investedUsdt = Number(formatEther(order.investedUsdt || 0n));
    const totalQuota = Number(formatEther(order.totalQuota || 0n));
    const releasedUsdt = Number(formatEther(order.releasedUsdt || 0n));
    const withdrawnHaf = Number(formatEther(order.withdrawnHaf || 0n));
    const isActive = order.isActive || false;
    const startTime = Number(order.startTime || 0n);
    
    // 判断方案等级
    let planName = 'stakingPage.bronze';
    if (investedUsdt >= 3000) planName = 'stakingPage.diamond';
    else if (investedUsdt >= 1000) planName = 'stakingPage.gold';
    else if (investedUsdt >= 500) planName = 'stakingPage.silver';
    
    return {
      id: index,
      plan: planName,
      amount: investedUsdt.toFixed(2),
      totalQuota: totalQuota.toFixed(2),
      released: releasedUsdt.toFixed(2),
      releasedHAF: withdrawnHaf.toFixed(2),
      status: isActive ? '进行中' : '已完成',
      time: new Date(startTime * 1000).toLocaleString('zh-CN'),
    };
  });
});

// 检查是否需要授权
const needsApproval = computed(() => {
  if (!stakeAmount.value) return false;
  const amount = parseEther(stakeAmount.value.toString());
  const currentAllowance = allowanceData.value as bigint || 0n;
  return currentAllowance < amount;
});

// 按钮文本
const buttonText = computed(() => {
  if (!address.value) return t('stakingPage.connectWallet');
  if (isProcessing.value) return t('stakingPage.processing');
  if (needsApproval.value) return t('stakingPage.approveUsdt');
  return t('stakingPage.stakeNow');
});

// 质押函数
const handleStake = async () => {
  if (!address.value || !stakeAmount.value || stakeAmount.value < (selectedPlan.value?.minStake ?? 0)) {
    toast.error(t('stakingPage.invalidAmount'));
    return;
  }
  
  isProcessing.value = true;
  
  try {
    // 0. 检查是否绑定推荐人
    const referrer = (userInfo.value as any)?.referrer || '0x0000000000000000000000000000000000000000';
    if (referrer === '0x0000000000000000000000000000000000000000') {
      toast.warning(t('stakingPage.bindReferrerFirst'));
      isProcessing.value = false;
      // 跳转到个人页面绑定推荐人
      router.push('/profile');
      return;
    }
    
    const amount = parseEther(stakeAmount.value.toString());
    
    // 1. 检查授权
    const currentAllowance = allowanceData.value as bigint || 0n;
    if (currentAllowance < amount) {
      toast.info(t('stakingPage.approving'));
      
      await writeContractAsync({
        address: USDT_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, maxUint256],
      });
      
      toast.success(t('stakingPage.approveSuccess'));
      await refetchAllowance();
      
      // 授权成功后，等待用户再次点击质押
      isProcessing.value = false;
      return;
    }
    
    // 2. 执行质押
    toast.info(t('stakingPage.staking'));
    
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'stake',
      args: [amount],
    });
    
    toast.success(t('stakingPage.stakeSuccess'));
    
    // 3. 刷新数据
    stakeAmount.value = null;
    await refetchOrders();
    await refetchUsdtBalance();
    
  } catch (error: any) {
    console.error('Stake error:', error);
    // 特殊处理推荐人错误
    if (error.message?.includes('Must bind a referrer first')) {
      toast.error(t('stakingPage.bindReferrerFirst'));
      router.push('/profile');
    } else {
      toast.error(error.shortMessage || error.message || t('stakingPage.stakeFailed'));
    }
  } finally {
    isProcessing.value = false;
  }
};

// 页面跳转逻辑
const openOrderDetail = (order: any) => {
  router.push(`/staking/order/${order.id}`);
};
</script>

<style scoped>
/* Smooth animations */
.card {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
</style>