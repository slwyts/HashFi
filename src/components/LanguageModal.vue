<template>
  <div
    v-if="show"
    @click.self="$emit('close')"
    class="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm transition-all duration-300"
  >
    <!-- 弹窗主体 - 简洁设计 -->
    <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md mx-auto overflow-hidden transform transition-all duration-300 scale-100">
      <!-- 头部 - 纯蓝色 -->
      <div class="bg-blue-600 p-6">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">{{ t('languageModal.title') }}</h2>
          </div>
          <button 
            @click="$emit('close')" 
            class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-2xl"
          >
            &times;
          </button>
        </div>
      </div>
      
      <!-- 语言列表 -->
      <div class="p-6">
        <div class="space-y-3">
          <button
            v-for="lang in availableLanguages" 
            :key="lang.code"
            @click="selectLanguage(lang.code)"
            :class="[
              'w-full text-left p-4 rounded-xl text-base font-medium transition-all duration-200 flex items-center justify-between group',
              locale === lang.code
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 hover:border-blue-300'
            ]"
          >
            <div class="flex items-center space-x-3">
              <span class="text-2xl">{{ lang.flag }}</span>
              <span>{{ lang.name }}</span>
            </div>
            <svg 
              v-if="locale === lang.code"
              class="w-5 h-5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <svg 
              v-else
              class="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

// 定义 props 和 emits
defineProps<{
  show: boolean;
}>();
const emit = defineEmits(['close']);

const { locale, t } = useI18n();

const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
//   { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
//   { code: 'es', name: 'Español', flag: '🇪🇸' },
//   { code: 'ko', name: '한국어', flag: '🇰🇷' },
//   { code: 'ja', name: '日本語', flag: '🇯🇵' },
  // ... 可以继续添加其他语言
];

const selectLanguage = (langCode: string) => {
  locale.value = langCode;
  emit('close');
};
</script>