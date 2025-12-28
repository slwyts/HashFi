<template>
  <footer class="glass border-t border-blue-100">
    <nav class="flex justify-around items-center h-16 relative">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-full h-full text-gray-500 relative group"
        v-slot="{ isActive }"
      >
        <!-- 活动指示器 -->
        <div 
          v-if="isActive" 
          class="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-b-full"
        ></div>
        
        <div class="flex flex-col items-center transition-all duration-200" :class="{ 'transform -translate-y-0.5': isActive }">
          <div class="relative">
            <img 
              :src="isActive ? item.activeIcon : item.icon" 
              :alt="t(item.label)" 
              class="w-6 h-6 mb-1 transition-all duration-200"
              :class="{ 'scale-110': isActive }"
            />
            <!-- 图标发光效果 -->
            <div 
              v-if="isActive" 
              class="absolute inset-0 bg-blue-400 blur-md opacity-30 rounded-full"
            ></div>
          </div>
          <span
            class="text-xs font-medium transition-all duration-200"
            :class="isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 group-hover:text-gray-700'"
          >
            {{ t(item.label) }}
          </span>
        </div>
      </router-link>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const navItems = computed(() => [
  { path: '/staking', label: 'bottomNav.staking', icon: '/icons/staking.svg', activeIcon: '/icons/staking-.svg' },
  { path: '/income', label: 'bottomNav.income', icon: '/icons/income.svg', activeIcon: '/icons/income-.svg' },
  // { path: '/swap', label: 'bottomNav.swap', icon: '/icons/flash_exchange.svg', activeIcon: '/icons/flash-.svg' },
  { path: '/team', label: 'bottomNav.team', icon: '/icons/ecosystem.svg', activeIcon: '/icons/eco-.svg' },
  { path: '/profile', label: 'bottomNav.profile', icon: '/icons/profile.svg', activeIcon: '/icons/profile-.svg' },
]);
</script>

<style scoped>
/* 导航项悬停效果 */
.group:hover {
  background: linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.05) 100%);
}
</style>