<template>
  <!-- 公告弹窗 -->
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-gray-200">
          <!-- 头部 -->
          <div class="border-b border-gray-200 p-5 relative">
            <div class="flex items-start gap-3">
              <!-- 公告类型图标 -->
              <div v-if="announcement.type === 'important' || announcement.type === 'urgent'" class="flex-shrink-0 w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                <svg v-if="announcement.type === 'urgent'" class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 text-base mb-1">{{ announcement.title }}</h3>
                <p class="text-xs text-gray-500">{{ formatDate(announcement.createdAt) }}</p>
              </div>
              <!-- 关闭按钮 -->
              <button
                @click="handleClose"
                class="flex-shrink-0 w-8 h-8 rounded hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 内容 -->
          <div class="p-6 overflow-y-auto max-h-96 text-gray-700 text-sm leading-relaxed">
            <div class="prose prose-sm max-w-none" v-html="announcement.content"></div>
          </div>

          <!-- 底部按钮 -->
          <div class="p-4 border-t border-gray-200 flex gap-3">
            <button
              @click="handleDontShowAgain"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {{ t('announcement.dontShowAgain') }}
            </button>
            <button
              @click="handleViewDetails"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              {{ t('announcement.viewDetails') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'important' | 'urgent';
  active: boolean;
  createdAt: string;
}

const props = defineProps<{
  announcement: Announcement;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  dontShowAgain: [id: string];
}>();

const { t } = useI18n();
const router = useRouter();
const isVisible = ref(props.visible);

watch(() => props.visible, (newVal) => {
  isVisible.value = newVal;
});

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const handleClose = () => {
  isVisible.value = false;
  emit('close');
};

const handleDontShowAgain = () => {
  // 保存到本地存储
  const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
  if (!readAnnouncements.includes(props.announcement.id)) {
    readAnnouncements.push(props.announcement.id);
    localStorage.setItem('readAnnouncements', JSON.stringify(readAnnouncements));
  }
  emit('dontShowAgain', props.announcement.id);
  handleClose();
};

const handleViewDetails = () => {
  router.push({
    name: 'content',
    params: {
      data: btoa(JSON.stringify({
        type: 'announcement',
        id: props.announcement.id
      }))
    }
  });
  handleClose();
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white {
  transform: scale(0.9);
}

.modal-leave-to .bg-white {
  transform: scale(0.9);
}
</style>
