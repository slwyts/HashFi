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
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-white shadow">
              <img :src="fromToken.icon" :alt="fromToken.name" class="w-10 h-10 rounded-full object-cover" />
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
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-white shadow">
              <img :src="toToken.icon" :alt="toToken.name" class="w-10 h-10 rounded-full object-cover" />
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
    
    <!-- Add Token CTA -->
    <div class="mt-5">
      <div class="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-100 rounded-2xl p-4 shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col">
          <p class="text-sm font-semibold text-blue-600">{{ t('swapPage.addTokenTitle') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ t('swapPage.addTokenDescription') }}</p>
        </div>
        <div class="flex flex-col sm:items-end gap-2">
          <button
            @click="addTokenToWallet"
            class="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="isAddingToken || !isWalletAvailable"
          >
            <svg v-if="!isAddingToken" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8m0 0v4m0-4a8 8 0 018 8" />
            </svg>
            <span>{{ isAddingToken ? t('swapPage.addTokenProcessing') : t('swapPage.addTokenButton') }}</span>
          </button>
          <p v-if="!isWalletAvailable" class="text-xs text-gray-400">{{ t('swapPage.walletNotSupported') }}</p>
        </div>
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
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-white shadow">
              <img :src="token.icon" :alt="token.name" class="w-10 h-10 rounded-full object-cover" />
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
import { useAccount, useReadContract, useConfig } from '@wagmi/vue';
import { getBlock } from '@wagmi/core';
import { formatUnits, parseUnits, maxUint256, type Address } from 'viem';
import { abi, erc20Abi, uniswapV2PairAbi, uniswapV2RouterAbi, hafTokenAbi, CONTRACT, USDT } from '@/core/contract';
import { useToast } from '@/composables/useToast';
import { useEnhancedContract } from '@/composables/useEnhancedContract';

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();
const config = useConfig();

const HASHFI_CONTRACT = CONTRACT;
const USDT_ADDRESS = USDT;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

const getEthereumProvider = (): EthereumProvider | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as any).ethereum as EthereumProvider | undefined;
};

const isWalletAvailable = computed(() => !!getEthereumProvider());
const isAddingToken = ref(false);

// ========== 1. 获取 HAFToken 地址 ==========
const { data: hafTokenAddress } = useReadContract({
  address: HASHFI_CONTRACT,
  abi,
  functionName: 'hafToken',
  query: { staleTime: 60000 }
});

// ========== 2. 获取 LP Pair 地址 ==========
const { data: lpPairAddress } = useReadContract({
  address: HASHFI_CONTRACT,
  abi,
  functionName: 'getLpPairAddress',
  query: { staleTime: 60000 }
});

// ========== 3. 获取 Router 地址（从 HAFToken 合约） ==========
const { data: routerAddress } = useReadContract({
  address: computed(() => hafTokenAddress.value as Address | undefined),
  abi: hafTokenAbi,
  functionName: 'pancakeRouter',
  query: {
    enabled: computed(() => !!hafTokenAddress.value),
    staleTime: 60000
  }
} as any);

// ========== 4. 获取 HAF 价格（从主合约的 getHafPrice） ==========
const { data: hafPrice } = useReadContract({
  address: HASHFI_CONTRACT,
  abi,
  functionName: 'getHafPrice',
  query: { refetchInterval: 30000 }
});

// ========== 5. 获取 LP 池储备 ==========
const { data: lpReserves, refetch: refetchReserves } = useReadContract({
  address: computed(() => lpPairAddress.value as Address | undefined),
  abi: uniswapV2PairAbi,
  functionName: 'getReserves',
  query: {
    enabled: computed(() => !!lpPairAddress.value),
    refetchInterval: 10000
  }
} as any);

// ========== 6. 获取 LP 池 token0 地址 ==========
const { data: lpToken0 } = useReadContract({
  address: computed(() => lpPairAddress.value as Address | undefined),
  abi: uniswapV2PairAbi,
  functionName: 'token0',
  query: { enabled: computed(() => !!lpPairAddress.value) }
} as any);

// HAF 价格显示 (18 decimals - 合约使用 PRICE_PRECISION = 1e18)
const hafPriceDisplay = computed(() => {
  if (!hafPrice.value) return '0.00';
  return parseFloat(formatUnits(hafPrice.value as bigint, 18)).toFixed(4);
});

// ========== 7. 获取 USDT 余额 ==========
const { data: usdtBalanceRaw, refetch: refetchUsdtBalance } = useReadContract({
  address: USDT_ADDRESS,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: computed(() => address.value ? [address.value] as const : undefined),
  query: { enabled: !!address.value }
} as any);

const usdtBalanceDisplay = computed(() => {
  if (!usdtBalanceRaw.value) return '0.00';
  return parseFloat(formatUnits(usdtBalanceRaw.value as bigint, 18)).toFixed(2);
});

// ========== 8. 获取 HAF 余额（使用 HAFToken 地址） ==========
const { data: hafBalanceRaw, refetch: refetchHafBalance } = useReadContract({
  address: computed(() => hafTokenAddress.value as Address | undefined),
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: computed(() => address.value ? [address.value] as const : undefined),
  query: { enabled: computed(() => !!address.value && !!hafTokenAddress.value) }
} as any);

const hafBalanceDisplay = computed(() => {
  if (!hafBalanceRaw.value) return '0.00';
  return parseFloat(formatUnits(hafBalanceRaw.value as bigint, 18)).toFixed(4);
});

// HAFToken 地址显示（用于添加到钱包）
const hafTokenAddressDisplay = computed(() => hafTokenAddress.value as Address | undefined);

const addTokenToWallet = async () => {
  if (isAddingToken.value) return;

  if (!isWalletAvailable.value) {
    toast.error(t('swapPage.walletNotSupported'));
    return;
  }

  const provider = getEthereumProvider();
  if (!provider) {
    toast.error(t('swapPage.walletNotSupported'));
    return;
  }

  if (!hafTokenAddressDisplay.value) {
    toast.error('HAFToken address not loaded');
    return;
  }

  isAddingToken.value = true;

  try {
    const imageUrl = typeof window !== 'undefined'
      ? new URL('/logo.png', window.location.origin).href
      : '/logo.png';

    const result = await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: hafTokenAddressDisplay.value,
          symbol: 'HAF',
          decimals: 18,
          image: imageUrl,
        },
      },
    });

    if (result) {
      toast.success(t('swapPage.addTokenSuccess'));
    } else {
      toast.info(t('swapPage.addTokenUserRejected'));
    }
  } catch (error: any) {
    if (error?.code === 4001) {
      toast.info(t('swapPage.addTokenUserRejected'));
      return;
    }
    const message = error?.message || t('swapPage.unknownError');
    toast.error(t('swapPage.addTokenFailed', { message }));
  } finally {
    isAddingToken.value = false;
  }
};

// ========== 9. 代币配置 ==========
const tokens = computed(() => ({
  HAF: {
    name: 'HAF',
    icon: '/logo.png',
    balance: hafBalanceDisplay.value,
    decimals: 18,
    address: hafTokenAddressDisplay.value || ('' as Address)
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

// 更新代币余额和地址
watch(() => tokens.value, (newTokens) => {
  Object.assign(fromToken, fromToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
  Object.assign(toToken, toToken.name === 'USDT' ? newTokens.USDT : newTokens.HAF);
}, { deep: true });

// ========== 10. 计算汇率 ==========
const currentRate = computed(() => {
  if (!hafPrice.value) return '0';
  const price = parseFloat(formatUnits(hafPrice.value as bigint, 18));

  if (fromToken.name === 'USDT') {
    // USDT → HAF: 1 USDT = 1/hafPrice HAF
    return price > 0 ? (1 / price).toFixed(4) : '0';
  } else {
    // HAF → USDT: 1 HAF = hafPrice USDT
    return price.toFixed(4);
  }
});

// ========== 11. 使用恒定乘积公式计算兑换数量 ==========
const calculateSwapOutput = (amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint => {
  if (reserveIn === 0n || reserveOut === 0n || amountIn === 0n) return 0n;
  // 扣除0.25%手续费 (9975/10000)
  const amountInWithFee = amountIn * 9975n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000n + amountInWithFee;
  return numerator / denominator;
};

// 根据LP池储备计算输出
const getSwapAmounts = computed(() => {
  if (!lpReserves.value || !lpToken0.value || !hafTokenAddressDisplay.value) {
    return { hafReserve: 0n, usdtReserve: 0n, isHafToken0: false };
  }

  const [reserve0, reserve1] = lpReserves.value as [bigint, bigint, number];
  const token0 = lpToken0.value as Address;

  // 确定哪个是HAF，哪个是USDT
  const isHafToken0 = token0.toLowerCase() === hafTokenAddressDisplay.value.toLowerCase();

  return {
    hafReserve: isHafToken0 ? reserve0 : reserve1,
    usdtReserve: isHafToken0 ? reserve1 : reserve0,
    isHafToken0
  };
});

// ========== 12. 兑换计算逻辑 ==========
const handleFromAmountChange = () => {
  if (!fromAmount.value || fromAmount.value <= 0) {
    toAmount.value = null;
    return;
  }

  const { hafReserve, usdtReserve } = getSwapAmounts.value;
  if (hafReserve === 0n || usdtReserve === 0n) {
    // 如果没有LP储备，使用价格估算
    if (!hafPrice.value) {
      toAmount.value = null;
      return;
    }
    const price = parseFloat(formatUnits(hafPrice.value as bigint, 18));
    if (fromToken.name === 'USDT') {
      toAmount.value = parseFloat((fromAmount.value / price).toFixed(4));
    } else {
      toAmount.value = parseFloat((fromAmount.value * price).toFixed(2));
    }
    return;
  }

  const amountIn = parseUnits(fromAmount.value.toString(), 18);

  if (fromToken.name === 'USDT') {
    // USDT -> HAF
    const hafOut = calculateSwapOutput(amountIn, usdtReserve, hafReserve);
    toAmount.value = parseFloat(parseFloat(formatUnits(hafOut, 18)).toFixed(4));
  } else {
    // HAF -> USDT
    const usdtOut = calculateSwapOutput(amountIn, hafReserve, usdtReserve);
    toAmount.value = parseFloat(parseFloat(formatUnits(usdtOut, 18)).toFixed(2));
  }
};

const handleToAmountChange = () => {
  if (!toAmount.value || toAmount.value <= 0) {
    fromAmount.value = null;
    return;
  }

  // 反向计算（简化处理，使用价格估算）
  if (!hafPrice.value) {
    fromAmount.value = null;
    return;
  }

  const price = parseFloat(formatUnits(hafPrice.value as bigint, 18));

  if (fromToken.name === 'USDT') {
    // 想要 X HAF，需要多少 USDT
    fromAmount.value = parseFloat((toAmount.value * price * 1.003).toFixed(2)); // 加上手续费估算
  } else {
    // 想要 X USDT，需要多少 HAF
    fromAmount.value = parseFloat((toAmount.value / price * 1.003).toFixed(4));
  }
};

// ========== 13. 切换代币 ==========
const switchTokens = () => {
  const tempToken = { ...fromToken };
  Object.assign(fromToken, toToken);
  Object.assign(toToken, tempToken);
  handleFromAmountChange();
};

// ========== 14. 授权检查（授权给 Router） ==========
const allowanceArgs = computed(() => {
  if (!address.value || !routerAddress.value) return undefined;
  return [address.value, routerAddress.value] as const;
});

// USDT 授权额度（给Router）
const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
  address: USDT_ADDRESS,
  abi: erc20Abi,
  functionName: 'allowance',
  args: allowanceArgs,
  query: {
    enabled: computed(() => !!address.value && !!routerAddress.value),
    refetchInterval: 3000
  }
} as any);

// HAF 授权额度（给Router）
const { data: hafAllowance, refetch: refetchHafAllowance } = useReadContract({
  address: computed(() => hafTokenAddressDisplay.value),
  abi: erc20Abi,
  functionName: 'allowance',
  args: allowanceArgs,
  query: {
    enabled: computed(() => !!address.value && !!routerAddress.value && !!hafTokenAddressDisplay.value),
    refetchInterval: 3000
  }
} as any);

const needsApproval = computed(() => {
  if (!address.value || !fromAmount.value || fromAmount.value <= 0 || !routerAddress.value) return false;

  const amount = parseUnits(fromAmount.value.toString(), 18);

  if (fromToken.name === 'USDT') {
    if (!usdtAllowance.value) return true;
    return (usdtAllowance.value as bigint) < amount;
  } else {
    if (!hafAllowance.value) return true;
    return (hafAllowance.value as bigint) < amount;
  }
});

// 增强的合约交互
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const handleApprove = async () => {
  if (!fromAmount.value || !address.value || !routerAddress.value) return;

  const tokenAddress = fromToken.name === 'USDT' ? USDT_ADDRESS : hafTokenAddressDisplay.value;
  if (!tokenAddress) return;

  try {
    await callContractWithRefresh(
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [routerAddress.value as Address, maxUint256],
        pendingMessage: t('swapPage.approving'),
        successMessage: t('swapPage.approveSuccess'),
        operation: `${fromToken.name} Approval for Router`,
      },
      {
        refreshAllowance: fromToken.name === 'USDT' ? refetchUsdtAllowance : refetchHafAllowance,
      }
    );
  } catch (error: any) {
    console.error('Approve error:', error);
  }
};

// ========== 15. 执行 Swap（使用 Router） ==========
const handleSwap = async () => {
  if (!fromAmount.value || !address.value || !routerAddress.value || !hafTokenAddressDisplay.value) return;

  const { hafReserve, usdtReserve } = getSwapAmounts.value;
  if (hafReserve === 0n || usdtReserve === 0n) {
    toast.error('LP pool not initialized');
    return;
  }

  try {
    const amountIn = parseUnits(fromAmount.value.toString(), 18);

    // 构建交易路径
    const path = fromToken.name === 'USDT'
      ? [USDT_ADDRESS, hafTokenAddressDisplay.value]  // USDT -> HAF
      : [hafTokenAddressDisplay.value, USDT_ADDRESS]; // HAF -> USDT

    // 计算最小输出（设置5%滑点保护，因为HAF有税）
    let expectedOutput: bigint;
    if (fromToken.name === 'USDT') {
      expectedOutput = calculateSwapOutput(amountIn, usdtReserve, hafReserve);
    } else {
      expectedOutput = calculateSwapOutput(amountIn, hafReserve, usdtReserve);
    }
    const amountOutMin = expectedOutput * 95n / 100n; // 5% 滑点（考虑税收）

    // deadline: 从区块链获取当前时间 + 20分钟（避免时间跳跃测试时过期）
    const block = await getBlock(config);
    const deadline = block.timestamp + 1200n; // 区块链时间 + 20分钟

    console.log('💱 Router Swap (SupportingFee):', {
      方向: `${fromToken.name} → ${toToken.name}`,
      输入金额: fromAmount.value,
      amountIn: amountIn.toString(),
      amountOutMin: amountOutMin.toString(),
      path,
      deadline: deadline.toString(),
      router: routerAddress.value
    });

    // 使用 swapExactTokensForTokensSupportingFeeOnTransferTokens（支持转账扣税代币）
    const swapWithFeeAbi = [
      {
        "inputs": [
          {"internalType": "uint256","name": "amountIn","type": "uint256"},
          {"internalType": "uint256","name": "amountOutMin","type": "uint256"},
          {"internalType": "address[]","name": "path","type": "address[]"},
          {"internalType": "address","name": "to","type": "address"},
          {"internalType": "uint256","name": "deadline","type": "uint256"}
        ],
        "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;

    await callContractWithRefresh(
      {
        address: routerAddress.value as Address,
        abi: swapWithFeeAbi,
        functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
        args: [amountIn, amountOutMin, path, address.value, deadline],
        pendingMessage: t('swapPage.swapping'),
        successMessage: t('swapPage.swapSuccess'),
        operation: `${fromToken.name} to ${toToken.name} Swap`,
        onConfirmed: () => {
          fromAmount.value = null;
          toAmount.value = null;
        }
      },
      {
        refreshBalance: async () => {
          await refetchUsdtBalance();
          await refetchHafBalance();
          await refetchReserves();
        },
      }
    );
  } catch (error: any) {
    console.error('Swap error:', error);
  }
};

// ========== 16. 按钮状态 ==========
const canSwap = computed(() => {
  if (!address.value) return false;
  if (!fromAmount.value || fromAmount.value <= 0) return false;
  if (!routerAddress.value || !hafTokenAddressDisplay.value) return false;
  if (fromToken.name === 'USDT' && fromAmount.value < 10) return false;

  const balance = parseFloat(fromToken.balance);
  if (fromAmount.value > balance) return false;

  if (needsApproval.value) return true;

  return true;
});

const buttonText = computed(() => {
  if (!address.value) return t('common.connectWallet');
  if (!routerAddress.value) return t('swapPage.lpNotInitialized') || 'Router Not Available';
  if (!fromAmount.value || fromAmount.value <= 0) return t('swapPage.enterAmount');
  if (fromToken.name === 'USDT' && fromAmount.value < 10) return t('swapPage.minSwapAmountError');
  if (fromAmount.value > parseFloat(fromToken.balance)) return t('swapPage.insufficientBalance');

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

// ========== 17. 代币选择器逻辑 ==========
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

  if (token.name === otherToken.name) {
    switchTokens();
  } else {
    Object.assign(currentToken, token);
    handleFromAmountChange();
  }

  closeTokenSelector();
};

const canSelectToken = (_token: any) => {
  return true;
};

const isCurrentToken = (token: any) => {
  const currentToken = selectorType.value === 'from' ? fromToken : toToken;
  return token.name === currentToken.name;
};
</script>