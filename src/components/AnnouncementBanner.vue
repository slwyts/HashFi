<template>
  <div class="modern-announcement-banner mb-4 overflow-hidden">
    <div class="flex items-center gap-3">
      <!-- 公告图标 -->
      <div class="announcement-icon">
        <img src="/icons/notice.png" alt="公告" class="w-5 h-5" />
      </div>
      
      <!-- 滚动文字容器 -->
      <div class="flex-1 overflow-hidden relative h-6">
        <transition name="slide">
          <div
            :key="currentIndex"
            class="absolute whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
            @click="announcements[currentIndex] && handleAnnouncementClick(announcements[currentIndex]!)"
          >
            <span class="font-semibold text-gray-900">{{ announcements[currentIndex]?.title }}</span>
            <span class="mx-2 text-gray-400">|</span>
            <span class="text-gray-600">{{ announcements[currentIndex]?.content?.substring(0, 50) }}...</span>
          </div>
        </transition>
      </div>

      <!-- 查看更多按钮 -->
      <button
        @click="goToAnnouncementList"
        class="announcement-button"
      >
        {{ t('announcement.viewAll') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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
  announcements: Announcement[];
  interval?: number;
}>();

const { t } = useI18n();
const router = useRouter();
const currentIndex = ref(0);
let timer: number | null = null;

const handleAnnouncementClick = (announcement: Announcement) => {
  router.push({
    name: 'content',
    params: {
      data: btoa(JSON.stringify({
        type: 'announcement',
        id: announcement.id
      }))
    }
  });
};

const goToAnnouncementList = () => {
  router.push({
    name: 'content',
    params: {
      data: btoa(JSON.stringify({
        type: 'announcement-list'
      }))
    }
  });
};

// 自动轮播
const startRotation = () => {
  if (props.announcements.length > 1) {
    timer = window.setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % props.announcements.length;
    }, props.interval || 5000);
  }
};

const stopRotation = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

onMounted(() => {
  startRotation();
});

onUnmounted(() => {
  stopRotation();
});
</script>

<style scoped>
/* 专业DeFi风格 - 简洁干净 */
.modern-announcement-banner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.modern-announcement-banner:hover {
  border-color: #cbd5e1;
}

.announcement-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.announcement-button {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  background: white;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.announcement-button:hover {
  color: #3b82f6;
  border-color: #3b82f6;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
