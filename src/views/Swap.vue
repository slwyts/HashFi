<template>
  <div class="p-4 bg-white min-h-screen flex flex-col font-sans">
    <div class="flex-grow">
      <div class="bg-gray-100/60 p-4 rounded-lg relative">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500">{{ t('swapPage.from') }}</span>
          <span class="text-sm text-gray-500">{{ t('swapPage.balance') }}: {{ fromToken.balance }}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center cursor-pointer">
            <img :src="fromToken.icon" :alt="fromToken.name" class="w-8 h-8 mr-2" />
            <span class="font-bold text-xl mr-1">{{ fromToken.name }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <input 
            type="number" 
            v-model="fromAmount"
            @input="handleFromAmountChange"
            :placeholder="t('swapPage.enterAmount')"
            class="flex-grow text-right bg-transparent text-2xl font-semibold focus:outline-none w-1/2"
          >
        </div>
         <div class="text-right text-gray-400 text-sm mt-1 pr-1">$ {{ fromValue.toFixed(2) }}</div>

        <p class="text-xs text-gray-500 mt-4">1 {{ fromToken.name }} ≈ {{ currentRate }} {{ toToken.name }}</p>
      </div>

      <div class="my-3 flex justify-center">
        <button @click="switchTokens" class="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition border-4 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      </div>

      <div class="bg-gray-100/60 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-500">{{ t('swapPage.to') }}</span>
          <span class="text-sm text-gray-500">{{ t('swapPage.balance') }}: {{ toToken.balance }}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center cursor-pointer">
            <img :src="toToken.icon" :alt="toToken.name" class="w-8 h-8 mr-2" />
            <span class="font-bold text-xl mr-1">{{ toToken.name }}</span>
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <input 
            type="number"
            v-model="toAmount"
            @input="handleToAmountChange"
            :placeholder="t('swapPage.enterAmount')" 
            class="flex-grow text-right bg-transparent text-2xl font-semibold focus:outline-none w-1/2"
          >
        </div>
         <div class="text-right text-gray-400 text-sm mt-1 pr-1">$ {{ toValue.toFixed(2) }}</div>
      </div>
      
      <div class="bg-gray-100/60 p-4 rounded-lg mt-4 flex items-center">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
         </svg>
         <span class="text-gray-600">{{ t('swapPage.receivingAddress') }}</span>
         <span class="text-gray-400 ml-auto">--</span>
      </div>

      <div class="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <span>{{ t('swapPage.minSwapAmount', { amount: 10, token: 'USDT' }) }}</span>
      </div>
    </div>

    <div class="mt-4">
      <button 
        class="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        :disabled="!fromAmount || fromAmount <= 0"
      >
        {{ t('swapPage.swap') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 模拟代币数据
const tokens = {
  HAF: { name: 'HAF', icon: '/icons/coin.svg', balance: 1500.75, usdPrice: 1.5 }, // HAF的文档名称是HAF
  USDT: { name: 'USDT', icon: '/icons/usdt.svg', balance: 1234.56, usdPrice: 1.0 },
};

// 模拟汇率
const hafToUsdtRate = ref(1.5); // 1 HAF = 1.5 USDT

// 响应式状态
const fromToken = reactive({ ...tokens.HAF });
const toToken = reactive({ ...tokens.USDT });
const fromAmount = ref<number | null>(null);
const toAmount = ref<number | null>(null);

// 计算当前汇率
const currentRate = computed(() => {
  if (fromToken.name === 'HAF') {
    return hafToUsdtRate.value;
  }
  return 1 / hafToUsdtRate.value;
});

// 计算美元价值
const fromValue = computed(() => (fromAmount.value || 0) * fromToken.usdPrice);
const toValue = computed(() => (toAmount.value || 0) * toToken.usdPrice);

// 切换代币
const switchTokens = () => {
  const tempToken = { ...fromToken };
  Object.assign(fromToken, toToken);
  Object.assign(toToken, tempToken);
  handleFromAmountChange();
};

// 处理输入变化
const handleFromAmountChange = () => {
  if (fromAmount.value && fromAmount.value > 0) {
    toAmount.value = parseFloat((fromAmount.value * currentRate.value).toFixed(6));
  } else {
    toAmount.value = null;
  }
};

const handleToAmountChange = () => {
  if (toAmount.value && toAmount.value > 0) {
    fromAmount.value = parseFloat((toAmount.value / currentRate.value).toFixed(6));
  } else {
    fromAmount.value = null;
  }
}
</script>