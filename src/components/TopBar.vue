<template>
  <header class="bg-white shadow-sm p-4 flex justify-between items-center">
    <div>
      <w3m-button v-if="!isConnected" />
      
      <div v-else @click="openAccountModal" class="flex items-center space-x-2 cursor-pointer">
        <span class="font-mono text-gray-800 font-semibold">{{ formattedAddress }}</span>
        <img 
          src="/icons/copy.svg" 
          alt="Copy Address" 
          class="w-4 h-4 copy-icon"
          @click.stop="copyAddress" 
        />
      </div>
    </div>

    <div @click="isModalVisible = true" class="flex items-center space-x-2 cursor-pointer">
      <img src="/icons/language.svg" alt="Language" class="w-6 h-6" />
      <span>{{ currentLanguageName }}</span>
      <span class="text-xs">▼</span>
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

// --- Wallet Logic ---
const { address, isConnected } = useAccount();
const modal = useWeb3Modal();

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
      // You can replace this with a more subtle notification component
      alert('Address copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy address: ', err);
      alert('Failed to copy address.');
    }
  }
};

const openAccountModal = () => {
  modal.open({ view: 'Account' });
};

// --- Language Modal Logic ---
const isModalVisible = ref(false);
const { locale } = useI18n();

const languageNames: { [key: string]: string } = {
  'en': 'English',
  'zh-CN': '简体中文',
};

const currentLanguageName = computed(() => {
  return languageNames[locale.value] || 'Language';
});
</script>

<style scoped>
/* Applies a blue color to the copy icon. 
   This works best if the source SVG is black. */
.copy-icon {
  filter: invert(39%) sepia(80%) saturate(1413%) hue-rotate(205deg) brightness(90%) contrast(96%);
}
</style>