<template>
  <div class="relative w-full overflow-hidden rounded-xl shadow-lg mb-4">
    <!-- 轮播图片容器 -->
    <div class="relative w-full" :style="{ height: containerHeight + 'px' }">
      <transition-group name="fade" mode="out-in">
        <div
          v-for="(banner, index) in banners"
          :key="banner.id"
          v-show="currentIndex === index"
          class="absolute inset-0"
        >
          <img
            :src="banner.imageUrl"
            :alt="banner.title"
            class="w-full h-full object-cover"
            @click="handleBannerClick(banner)"
            @load="handleImageLoad($event, index)"
            ref="bannerImages"
          />
          <!-- 渐变遮罩 - 仅底部区域 -->
          <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          <!-- 标题 -->
          <div class="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none">
            <h3 class="font-bold text-lg mb-1">{{ banner.title }}</h3>
            <p class="text-sm opacity-90">{{ banner.description }}</p>
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  order: number;
  active: boolean;
  createdAt: string;
}

const props = defineProps<{
  banners: Banner[];
  autoPlayInterval?: number;
}>();

const router = useRouter();
const currentIndex = ref(0);
const containerHeight = ref(200); // 默认高度
const imageHeights = ref<number[]>([]);
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

const handleImageLoad = (event: Event, index: number) => {
  const img = event.target as HTMLImageElement;
  const containerWidth = img.parentElement?.parentElement?.clientWidth || 0;
  
  if (containerWidth > 0) {
    // 计算保持宽高比的高度
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    const calculatedHeight = containerWidth * aspectRatio;
    
    imageHeights.value[index] = calculatedHeight;
    
    // 使用所有已加载图片中的最大高度
    const maxHeight = Math.max(...imageHeights.value.filter(h => h > 0));
    if (maxHeight > 0) {
      containerHeight.value = maxHeight;
    }
  }
};

const handleBannerClick = (banner: Banner) => {
  if (banner.link) {
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
  // 初始化图片高度数组
  imageHeights.value = new Array(props.banners.length).fill(0);
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
