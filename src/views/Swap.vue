<template>
  <div class="p-4 bg-gradient-to-b from-gray-50 to-white min-h-screen font-sans">
    <!-- From Token Card -->
    <div class="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
      <!-- 装饰性渐变背景 -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
      
      <div class="relative z-10">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500 font-medium">{{ t('swapPage.from') }}</span>
          <span class="text-sm text-gray-500">{{ t('swapPage.balance') }}: <span class="font-semibold text-gray-700">{{ fromToken.balance }}</span></span>
        </div>
        <div class="flex justify-between items-center">
          <div @click="openTokenSelector('from')" class="flex items-center cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors">
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3" :class="fromToken.name === 'HAF' ? 'bg-black' : ''">
              <img :src="fromToken.icon" :alt="fromToken.name" :class="fromToken.name === 'HAF' ? 'w-6 h-6' : 'w-10 h-10 rounded-full object-cover'" />
            </div>
            <span class="font-bold text-xl mr-1">{{ fromToken.name }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <input 
            type="number" 
            v-model="fromAmount"
            @input="handleFromAmountChange"
            :placeholder="t('swapPage.enterAmount')"
            class="flex-grow text-right bg-transparent text-2xl font-semibold focus:outline-none w-1/2"
          >
        </div>
        <div class="text-right text-gray-400 text-sm mt-2 pr-1">$ {{ fromValue.toFixed(2) }}</div>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-base font-semibold text-gray-700 flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            1 {{ fromToken.name }} ≈ {{ currentRate }} {{ toToken.name }}
          </p>
        </div>
      </div>
    </div>

    <!-- Switch Button -->
    <div class="my-4 flex justify-center">
      <button @click="switchTokens" class="w-12 h-12 rounded-full bg-white hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl border border-gray-200 flex items-center justify-center">
        <img src="/icons/swap.svg" alt="swap" class="w-full h-full" />
      </button>
    </div>

    <!-- To Token Card -->
    <div class="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
      <!-- 装饰性渐变背景 -->
      <div class="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
      
      <div class="relative z-10">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500 font-medium">{{ t('swapPage.to') }}</span>
          <span class="text-sm text-gray-500">{{ t('swapPage.balance') }}: <span class="font-semibold text-gray-700">{{ toToken.balance }}</span></span>
        </div>
        <div class="flex justify-between items-center">
          <div @click="openTokenSelector('to')" class="flex items-center cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors">
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3" :class="toToken.name === 'HAF' ? 'bg-black' : ''">
              <img :src="toToken.icon" :alt="toToken.name" :class="toToken.name === 'HAF' ? 'w-6 h-6' : 'w-10 h-10 rounded-full object-cover'" />
            </div>
            <span class="font-bold text-xl mr-1">{{ toToken.name }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <input 
            type="number"
            v-model="toAmount"
            @input="handleToAmountChange"
            :placeholder="t('swapPage.enterAmount')" 
            class="flex-grow text-right bg-transparent text-2xl font-semibold focus:outline-none w-1/2"
          >
        </div>
        <div class="text-right text-gray-400 text-sm mt-2 pr-1">$ {{ toValue.toFixed(2) }}</div>
      </div>
    </div>
    
    <!-- Warning Notice -->
    <div class="bg-gradient-to-r from-red-50 to-orange-50 text-red-600 text-sm p-3 rounded-xl mt-4 flex items-start border border-red-100">
      <div class="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center mr-2.5 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </div>
      <span class="pt-0.5 text-xs">{{ t('swapPage.minSwapAmount', { amount: 10, token: 'USDT' }) }}</span>
    </div>

    <!-- Swap Button -->
    <div class="mt-5">
      <button 
        @click="handleButtonClick"
        class="w-full text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        :class="{
          'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700': canSwap && !isProcessing(),
          'bg-gradient-to-r from-blue-300 to-blue-400 cursor-not-allowed': !canSwap || isProcessing()
        }"
        :disabled="!canSwap || isProcessing()"
      >
        {{ buttonText }}
      </button>
    </div>

    <!-- Token Selector Modal -->
    <div v-if="showTokenSelector" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click="closeTokenSelector">
      <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-96 overflow-hidden">
        <!-- Modal Header -->
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800">{{ t('swapPage.selectToken') }}</h3>
          <button @click="closeTokenSelector" class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Token List -->
        <div class="p-2">
          <div 
            v-for="(token, key) in tokens" 
            :key="key"
            @click="selectToken(token)"
            class="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
            :class="{ 'opacity-50 pointer-events-none': !canSelectToken(token) }"
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3" :class="token.name === 'HAF' ? 'bg-black' : ''">
              <img :src="token.icon" :alt="token.name" :class="token.name === 'HAF' ? 'w-6 h-6' : 'w-10 h-10 rounded-full object-cover'" />
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-800">{{ token.name }}</div>
              <div class="text-sm text-gray-500">{{ t('swapPage.balance') }}: {{ token.balance }}</div>
            </div>
            <div v-if="isCurrentToken(token)" class="w-5 h-5 text-blue-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount, useReadContract, useBalance } from '@wagmi/vue';
import { formatUnits, parseUnits, maxUint256, type Address } from 'viem';
import { abi, erc20Abi, CONTRACT, USDT } from '@/core/contract';
import { useToast } from '@/composables/useToast';
import { useEnhancedContract } from '@/composables/useEnhancedContract';

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = CONTRACT;
const USDT_ADDRESS = USDT;

// ========== 1. 获取 HAF 价格 ==========
const { data: hafPrice, refetch: refetchPrice } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
  query: {
    refetchInterval: 30000, // 每30秒刷新一次
  }
});

// HAF 价格显示 (18 decimals - 合约使用 PRICE_PRECISION = 1e18)
const hafPriceDisplay = computed(() => {
  if (!hafPrice.value) return '0.00';
  return parseFloat(formatUnits(hafPrice.value as bigint, 18)).toFixed(4);
});

// ========== 2. 获取 USDT 余额 ==========
const { data: usdtBalance, refetch: refetchUsdtBalance } = useBalance({
  address: address,
  token: USDT_ADDRESS,
  query: {
    enabled: !!address,
  }
});

const usdtBalanceDisplay = computed(() => {
  if (!usdtBalance.value) return '0.00';
  return parseFloat(formatUnits(usdtBalance.value.value, 18)).toFixed(2);  // 测试网USDT是18位
});

// ========== 3. 获取 HAF 余额 ==========
const { data: hafBalance, refetch: refetchHafBalance } = useBalance({
  address: address,
  token: CONTRACT_ADDRESS,
  query: {
    enabled: !!address,
  }
});

const hafBalanceDisplay = computed(() => {
  if (!hafBalance.value) return '0.00';
  return parseFloat(formatUnits(hafBalance.value.value, 18)).toFixed(4);
});

// ========== 4. 代币配置 ==========
const tokens = computed(() => ({
  HAF: { 
    name: 'HAF', 
    icon: '/icons/hashfi_yellow.png', 
    balance: hafBalanceDisplay.value, 
    decimals: 18,
    address: CONTRACT_ADDRESS
  },
  USDT: { 
    name: 'USDT', 
    icon: '/icons/usdt.svg', 
    balance: usdtBalanceDisplay.value, 
    decimals: 18, 
    address: USDT_ADDRESS
  },
}));

// 响应式状态
const fromToken = reactive({ ...tokens.value.USDT });
const toToken = reactive({ ...tokens.value.HAF });
const fromAmount = ref<number | null>(null);
const toAmount = ref<number | null>(null);

// 代币选择器状态
const showTokenSelector = ref(false);
const selectorType = ref<'from' | 'to'>('from');

// 更新代币余额
watch(() => tokens.value, (newTokens) => {
  Object.assign(fromToken, fromToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
  Object.assign(toToken, toToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
}, { deep: true });

// ========== 5. 计算汇率 ==========
const currentRate = computed(() => {
  if (!hafPrice.value) return '0';
  const price = parseFloat(formatUnits(hafPrice.value as bigint, 18)); // ✅ 18 位精度
  
  if (fromToken.name === 'USDT') {
    // USDT → HAF: 1 USDT = 1/hafPrice HAF
    return (1 / price).toFixed(4);
  } else {
    // HAF → USDT: 1 HAF = hafPrice USDT
    return price.toFixed(4);
  }
});

// ========== 6. 兑换计算逻辑 ==========
const handleFromAmountChange = () => {
  if (!fromAmount.value || !hafPrice.value) {
    toAmount.value = null;
    return;
  }

  const price = parseFloat(hafPriceDisplay.value);
  // 考虑手续费: 2%
  const feeRate = 0.02;
  
  if (fromToken.name === 'USDT') {
    // USDT -> HAF
    const hafAmount = fromAmount.value / price;
    const afterFee = hafAmount * (1 - feeRate);
    toAmount.value = parseFloat(afterFee.toFixed(4));
  } else {
    // HAF -> USDT
    const usdtAmount = fromAmount.value * price;
    const afterFee = usdtAmount * (1 - feeRate);
    toAmount.value = parseFloat(afterFee.toFixed(2));
  }
};

const handleToAmountChange = () => {
  if (!toAmount.value || !hafPrice.value) {
    fromAmount.value = null;
    return;
  }

  const price = parseFloat(hafPriceDisplay.value);
  const feeRate = 0.02;
  
  if (fromToken.name === 'USDT') {
    // USDT -> HAF (反推需要的USDT)
    const hafBeforeFee = toAmount.value / (1 - feeRate);
    fromAmount.value = parseFloat((hafBeforeFee * price).toFixed(2));
  } else {
    // HAF -> USDT (反推需要的HAF)
    const usdtBeforeFee = toAmount.value / (1 - feeRate);
    fromAmount.value = parseFloat((usdtBeforeFee / price).toFixed(4));
  }
};

// ========== 7. 切换代币 ==========
const switchTokens = () => {
  const tempToken = { ...fromToken };
  Object.assign(fromToken, toToken);
  Object.assign(toToken, tempToken);
  handleFromAmountChange();
};

// ========== 8. USDT 授权 ==========
const allowanceArgs = computed(() => {
  if (!address.value || fromToken.name !== 'USDT') return undefined;
  return [address.value, CONTRACT_ADDRESS] as const;
});

const { data: allowance, refetch: refetchAllowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: erc20Abi,
  functionName: 'allowance',
  args: allowanceArgs,
  query: {
    enabled: computed(() => !!address.value && fromToken.name === 'USDT'),
    refetchInterval: 3000, // 每3秒刷新授权额度
  }
});

const needsApproval = computed(() => {
  // 只有USDT→HAF需要授权
  if (fromToken.name !== 'USDT') return false;
  
  // 如果未连接钱包或未输入金额，不检查授权
  if (!address.value || !fromAmount.value || fromAmount.value <= 0) return false;
  
  // 如果还没有查询到授权额度，假设需要授权
  if (!allowance.value) return true;
  
  const amount = parseUnits(fromAmount.value.toString(), 18);  // 测试网USDT是18位
  const needApproval = (allowance.value as bigint) < amount;
  
  console.log('🔍 授权检查:', {
    当前授权额度: allowance.value?.toString(),
    需要金额: amount.toString(),
    需要授权: needApproval
  });
  
  return needApproval;
});

// 增强的合约交互
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const handleApprove = async () => {
  if (!fromAmount.value || !address.value) return;

  try {
    await callContractWithRefresh(
      {
        address: USDT_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, maxUint256],
        pendingMessage: t('swapPage.approving'),
        successMessage: t('swapPage.approveSuccess'),
        operation: 'USDT Approval for Swap',
      },
      {
        refreshAllowance: refetchAllowance,
      }
    );
  } catch (error: any) {
    console.error('Approve error:', error);
    // 错误已经在 useEnhancedContract 中处理
  }
};

const handleSwap = async () => {
  if (!fromAmount.value || !address.value) return;

  try {
    const amount = parseUnits(fromAmount.value.toString(), 18);
    const tokenInAddress = fromToken.name === 'USDT' ? USDT_ADDRESS : CONTRACT_ADDRESS;
    
    console.log('💱 闪兑:', {
      方向: `${fromToken.name} → ${toToken.name}`,
      输入金额: fromAmount.value,
      Wei金额: amount.toString(),
      tokenIn地址: tokenInAddress,
      预计获得: toAmount.value
    });
    
    await callContractWithRefresh(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'swap',
        args: [tokenInAddress, amount],
        pendingMessage: t('swapPage.swapping'),
        successMessage: t('swapPage.swapSuccess'),
        operation: `${fromToken.name} to ${toToken.name} Swap`,
        onConfirmed: () => {
          // 清空输入
          fromAmount.value = null;
          toAmount.value = null;
        }
      },
      {
        refreshBalance: async () => {
          await refetchUsdtBalance();
          await refetchHafBalance();
        },
      }
    );
  } catch (error: any) {
    console.error('Swap error:', error);
    // 错误已经在 useEnhancedContract 中处理
  }
};

// ========== 10. 按钮状态 ==========
const canSwap = computed(() => {
  if (!address.value) return false;
  if (!fromAmount.value || fromAmount.value <= 0) return false;
  if (fromToken.name === 'USDT' && fromAmount.value < 10) return false; // 最小10 USDT
  
  const balance = parseFloat(fromToken.balance);
  if (fromAmount.value > balance) return false;
  
  // 如果需要授权，按钮也可点击（用于授权操作）
  if (needsApproval.value) return true;
  
  return true;
});

const buttonText = computed(() => {
  if (!address.value) return t('common.connectWallet');
  if (!fromAmount.value || fromAmount.value <= 0) return t('swapPage.enterAmount');
  if (fromToken.name === 'USDT' && fromAmount.value < 10) return t('swapPage.minSwapAmountError');
  if (fromAmount.value > parseFloat(fromToken.balance)) return t('swapPage.insufficientBalance');
  
  // 优先显示授权按钮（如果需要授权）
  if (needsApproval.value && !isProcessing()) return t('swapPage.approveUnlimited');
  if (isProcessing()) return t('swapPage.processing');
  
  return t('swapPage.swap');
});

const handleButtonClick = () => {
  if (!canSwap.value) return;
  if (needsApproval.value) {
    handleApprove();
  } else {
    handleSwap();
  }
};

// 美元价值（简化处理，USDT=1美元）
const fromValue = computed(() => {
  if (!fromAmount.value) return 0;
  if (fromToken.name === 'USDT') return fromAmount.value;
  return fromAmount.value * parseFloat(hafPriceDisplay.value);
});

const toValue = computed(() => {
  if (!toAmount.value) return 0;
  if (toToken.name === 'USDT') return toAmount.value;
  return toAmount.value * parseFloat(hafPriceDisplay.value);
});

// ========== 11. 代币选择器逻辑 ==========
const openTokenSelector = (type: 'from' | 'to') => {
  selectorType.value = type;
  showTokenSelector.value = true;
};

const closeTokenSelector = () => {
  showTokenSelector.value = false;
};

const selectToken = (token: any) => {
  const currentToken = selectorType.value === 'from' ? fromToken : toToken;
  const otherToken = selectorType.value === 'from' ? toToken : fromToken;
  
  // 如果选择的代币和另一个代币相同，则交换它们
  if (token.name === otherToken.name) {
    switchTokens();
  } else {
    // 否则直接更新当前代币
    Object.assign(currentToken, token);
    // 重新计算金额
    handleFromAmountChange();
  }
  
  closeTokenSelector();
};

const canSelectToken = (token: any) => {
  // 所有代币都可以选择
  return true;
};

const isCurrentToken = (token: any) => {
  const currentToken = selectorType.value === 'from' ? fromToken : toToken;
  return token.name === currentToken.name;
};
</script>