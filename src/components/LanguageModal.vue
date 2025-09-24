<template>
  <div
    v-if="show"
    @click.self="$emit('close')"
    class="fixed inset-0 bg-opacity-50 z-40 flex justify-center items-center backdrop-blur-sm"
  >
    <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-sm mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-800">{{ t('languageModal.title') }}</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-800">&times;</button>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto">
        <ul>
          <li v-for="lang in availableLanguages" :key="lang.code" class="my-2">
            <button
              @click="selectLanguage(lang.code)"
              :class="[
                'w-full text-left p-3 rounded-lg text-base',
                locale === lang.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              ]"
            >
              {{ lang.name }}
            </button>
          </li>
        </ul>
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
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
//   { code: 'zh-TW', name: '繁體中文' },
//   { code: 'es', name: 'Español' },
//   { code: 'ko', name: '한국어' },
//   { code: 'ja', name: '日本語' },
  // ... 可以继续添加其他语言
];

const selectLanguage = (langCode: string) => {
  locale.value = langCode;
  emit('close');
};
</script>