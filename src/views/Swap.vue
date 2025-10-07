<template>
  <div class="p-4 bg-gradient-to-b from-gray-50 to-white min-h-screen flex flex-col font-sans">
    <div class="flex-grow">
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
            <div class="flex items-center cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                <img :src="fromToken.icon" :alt="fromToken.name" class="w-6 h-6" />
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
            <p class="text-xs text-gray-500 flex items-center">
              <svg class="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              1 {{ fromToken.name }} ≈ {{ currentRate }} {{ toToken.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Switch Button -->
      <div class="my-4 flex justify-center">
        <button @click="switchTokens" class="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 border-4 border-white transform">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
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
            <div class="flex items-center cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-lg transition-colors">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                <img :src="toToken.icon" :alt="toToken.name" class="w-6 h-6" />
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
      
      <!-- Receiving Address -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mt-4 flex items-center border border-blue-100">
         <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
           </svg>
         </div>
         <div class="flex-grow">
           <span class="text-gray-600 font-medium">{{ t('swapPage.receivingAddress') }}</span>
         </div>
         <span class="text-gray-400">--</span>
      </div>

      <!-- Warning Notice -->
      <div class="bg-gradient-to-r from-red-50 to-orange-50 text-red-600 text-sm p-4 rounded-xl mt-6 flex items-start border border-red-100">
        <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center mr-3 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <span class="pt-0.5">{{ t('swapPage.minSwapAmount', { amount: 10, token: 'USDT' }) }}</span>
      </div>
    </div>

    <!-- Swap Button -->
    <div class="mt-6">
      <button 
        class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
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