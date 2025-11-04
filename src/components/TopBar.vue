<template>
  <header class="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-blue-100">
    <div>
      <!-- 自定义连接钱包按钮 -->
      <button 
        v-if="!isConnected" 
        @click="openConnectModal"
        class="relative px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 overflow-hidden group"
      >
        <!-- 背景动画效果 -->
        <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        
        <!-- 按钮内容 -->
        <div class="relative flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>{{ t('topBar.connectWallet') }}</span>
        </div>
      </button>
      
      <!-- 已连接状态 -->
      <div v-else @click="openAccountModal" class="flex items-center space-x-3 px-4 py-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
        <span class="font-mono text-white font-semibold text-sm">{{ formattedAddress }}</span>
        <img 
          src="/icons/copy.svg" 
          alt="Copy Address" 
          class="w-4 h-4 copy-icon-white"
          @click.stop="copyAddress" 
        />
      </div>
    </div>

    <!-- 语言切换按钮 - 现代化设计 -->
    <div @click="isModalVisible = true" class="relative group cursor-pointer">
      <div class="flex items-center space-x-2 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
        <span class="text-gray-700 font-medium text-sm">{{ currentLanguageName }}</span>
        <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </header>

  <LanguageModal :show="isModalVisible" @close="isModalVisible = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LanguageModal from './LanguageModal.vue';
import { useAccount } from '@wagmi/vue';
import { useWeb3Modal } from '@web3modal/wagmi/vue';
import { useToast } from '../composables/useToast';

const toast = useToast();

// --- Wallet Logic ---
const { address, isConnected } = useAccount();
const modal = useWeb3Modal();

// 防止重复打开模态框
let isModalOpening = false;

const formattedAddress = computed(() => {
  if (!address.value) return '';
  const addr = address.value;
  // Format address as 0xa2b...35D9201
  return `${addr.substring(0, 5)}...${addr.substring(addr.length - 5)}`;
});

const copyAddress = async () => {
  if (address.value) {
    try {
      await navigator.clipboard.writeText(address.value);
      toast.success(t('topBar.addressCopied'));
    } catch (err) {
      console.error('Failed to copy address: ', err);
      toast.error(t('topBar.copyFailed'));
    }
  }
};

const openConnectModal = () => {
  if (isModalOpening) {
    console.warn('Modal is already opening, please wait...');
    toast.warning(t('topBar.pleaseWait') || 'Please wait...');
    return;
  }
  
  try {
    isModalOpening = true;
    modal.open();
  } catch (error) {
    console.error('Failed to open connect modal:', error);
    toast.error(t('topBar.connectFailed') || 'Failed to open wallet connection');
  } finally {
    // 重置标志，允许下次打开
    setTimeout(() => {
      isModalOpening = false;
    }, 1000);
  }
};

const openAccountModal = () => {
  if (isModalOpening) {
    console.warn('Modal is already opening, please wait...');
    return;
  }
  
  try {
    isModalOpening = true;
    modal.open({ view: 'Account' });
  } finally {
    // 重置标志，允许下次打开
    setTimeout(() => {
      isModalOpening = false;
    }, 1000);
  }
};

// --- Language Modal Logic ---
const isModalVisible = ref(false);
const { locale, t } = useI18n();

const languageNames: { [key: string]: string } = {
  'en': 'English',
  'zh-CN': '简体中文',
};

const currentLanguageName = computed(() => {
  return languageNames[locale.value] || 'Language';
});
</script>

<style scoped>
/* White copy icon for gradient background */
.copy-icon-white {
  filter: brightness(0) invert(1);
}
</style>