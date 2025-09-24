<template>
  <header class="bg-white shadow-sm p-4 flex justify-between items-center">
    <div>
      <w3m-button />
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

const isModalVisible = ref(false);
const { locale } = useI18n();

// 语言名称映射
const languageNames: { [key: string]: string } = {
  'en': 'English',
  'zh-CN': '简体中文',
};

const currentLanguageName = computed(() => {
  return languageNames[locale.value] || 'Language';
});
</script>