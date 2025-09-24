<template>
  <div class="bg-gray-50 min-h-screen">
    <div class="p-6 bg-white rounded-b-3xl shadow-sm">
      <div class="flex items-center">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-2xl mr-4">
          {{ user.address.substring(2, 4).toUpperCase() }}
        </div>
        <div>
          <p class="font-bold text-lg font-mono">{{ formattedAddress }}</p>
          <span class="text-xs bg-yellow-100 text-yellow-700 font-semibold py-1 px-3 rounded-full">{{ t(user.level) }}</span>
        </div>
      </div>
    </div>
    <div class="p-4">
      <div class="bg-white p-5 rounded-xl shadow-sm text-center">
        <p class="text-sm text-gray-500">{{ t('profilePage.totalAssets') }} (HAF)</p>
        <p class="text-4xl font-bold my-2">8,530.45</p>
        <p class="text-sm text-gray-400">≈ $12,795.67</p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">{{ t('profilePage.withdraw') }}</button>
          <button class="w-full bg-gray-100 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors">{{ t('profilePage.records') }}</button>
        </div>
      </div>
    </div>

    <div class="px-4 space-y-4">
      <div class="bg-white rounded-xl shadow-sm">
        <ul class="divide-y divide-gray-100">
          <li @click="$router.push('/genesis-node')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div class="flex items-center">
              <img src="/icons/ecosystem.svg" class="w-6 h-6 mr-3" alt="node icon">
              <span class="font-semibold">{{ t('profilePage.applyNode') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div class="flex items-center">
              <img src="/icons/link.svg" class="w-6 h-6 mr-3" alt="link icon">
              <span class="font-semibold">{{ t('profilePage.bindReferrer') }}</span>
            </div>
             <div class="flex items-center">
                <span class="text-sm text-gray-500 mr-2 font-mono">{{ user.referrer ? '0x12...ab' : t('profilePage.notBound') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </li>
        </ul>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm">
        <ul class="divide-y divide-gray-100">
          <li @click="showInfo('aboutRwa')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <span class="font-semibold">{{ t('profilePage.aboutRwa') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li @click="showInfo('tokenomics')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <span class="font-semibold">{{ t('profilePage.tokenomics') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li @click="showInfo('roadmap')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <span class="font-semibold">{{ t('profilePage.roadmap') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow-sm">
        <ul class="divide-y divide-gray-100">
           <li class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <span class="font-semibold">{{ t('profilePage.helpCenter') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
           <li class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <span class="font-semibold">{{ t('profilePage.announcements') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
        </ul>
      </div>
    </div>

    <div class="p-4 mt-4">
        <button class="w-full bg-white text-red-500 font-bold py-3 rounded-xl shadow-sm hover:bg-red-50 transition-colors">{{ t('profilePage.disconnect') }}</button>
    </div>

    <InfoModal 
        :show="isModalVisible" 
        :title="modalTitle"
        :content="modalContent"
        @close="isModalVisible = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import InfoModal from '@/components/InfoModal.vue';

const { t } = useI18n();

// ... 用户数据 ...
const user = reactive({
  address: '0xa2b11c89b6a22e4835D9201aF2856413a2b11c89',
  level: 'stakingPage.diamond',
  referrer: '0x123...abc'
});
const formattedAddress = computed(() => {
  const addr = user.address;
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
});


// Modal 控制逻辑
const isModalVisible = ref(false);
const modalTitle = ref('');
const modalContent = ref('');

const infoContent = {
  aboutRwa: {
    title: 'profilePage.aboutRwa',
    content: 'profilePage.content.aboutRwa'
  },
  tokenomics: {
    title: 'profilePage.tokenomics',
    content: 'profilePage.content.tokenomics'
  },
  roadmap: {
    title: 'profilePage.roadmap',
    content: 'profilePage.content.roadmap'
  }
}

const showInfo = (type: 'aboutRwa' | 'tokenomics' | 'roadmap') => {
    modalTitle.value = t(infoContent[type].title);
    modalContent.value = t(infoContent[type].content);
    isModalVisible.value = true;
}

</script>