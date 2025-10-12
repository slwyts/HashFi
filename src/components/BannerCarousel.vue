<template>
  <div class="relative w-full overflow-hidden rounded-xl shadow-lg mb-4">
    <!-- 轮播图片容器 -->
    <div class="relative w-full">
      <transition-group name="fade" mode="out-in">
        <div
          v-for="(banner, index) in banners"
          :key="banner.id"
          v-show="currentIndex === index"
          class="relative w-full"
        >
          <img
            :src="banner.image"
            :alt="banner.title"
            class="w-full h-auto object-contain"
            @click="handleBannerClick(banner)"
          />
          <!-- 渐变遮罩 - 仅底部区域 -->
          <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          <!-- 标题 -->
          <div class="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none">
            <h3 class="font-bold text-lg mb-1">{{ banner.title }}</h3>
            <p class="text-sm opacity-90">{{ banner.subtitle }}</p>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 指示器 -->
    <div class="absolute bottom-4 right-4 flex gap-1.5 z-10">
      <button
        v-for="(_, index) in banners"
        :key="index"
        @click="goToSlide(index)"
        class="w-2 h-2 rounded-full transition-all duration-300"
        :class="currentIndex === index ? 'bg-white w-6' : 'bg-white/50'"
      ></button>
    </div>

    <!-- 左右切换按钮 -->
    <button
      @click="prevSlide"
      class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button
      @click="nextSlide"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors z-10"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

interface Banner {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  link?: string;
  announcementId?: number;
}

const props = defineProps<{
  banners: Banner[];
  autoPlayInterval?: number;
}>();

const router = useRouter();
const currentIndex = ref(0);
let autoPlayTimer: number | null = null;

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % props.banners.length;
};

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + props.banners.length) % props.banners.length;
};

const goToSlide = (index: number) => {
  currentIndex.value = index;
};

const handleBannerClick = (banner: Banner) => {
  if (banner.announcementId) {
    // 跳转到公告详情页
    router.push({
      name: 'content',
      params: {
        data: btoa(JSON.stringify({
          type: 'announcement',
          id: banner.announcementId
        }))
      }
    });
  } else if (banner.link) {
    // 外部链接
    window.open(banner.link, '_blank');
  }
};

// 自动播放
const startAutoPlay = () => {
  if (props.autoPlayInterval && props.banners.length > 1) {
    autoPlayTimer = window.setInterval(() => {
      nextSlide();
    }, props.autoPlayInterval);
  }
};

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
};

onMounted(() => {
  startAutoPlay();
});

onUnmounted(() => {
  stopAutoPlay();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
