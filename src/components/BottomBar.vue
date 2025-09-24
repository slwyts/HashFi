<template>
  <footer class="bg-white shadow-inner">
    <nav class="flex justify-around items-center h-16">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-full h-full text-gray-500"
        v-slot="{ isActive }"
      >
        <img 
          :src="isActive ? item.activeIcon : item.icon" 
          :alt="t(item.label)" 
          class="w-5 h-5 mb-0.5"
        />
        <span
          class="text-xs font-medium"
          :class="{ 'text-blue-600': isActive }"
        >
          {{ t(item.label) }}
        </span>
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
  { path: '/swap', label: 'bottomNav.swap', icon: '/icons/flash_exchange.svg', activeIcon: '/icons/flash-.svg' },
  { path: '/team', label: 'bottomNav.team', icon: '/icons/ecosystem.svg', activeIcon: '/icons/eco-.svg' },
  { path: '/profile', label: 'bottomNav.profile', icon: '/icons/profile.svg', activeIcon: '/icons/profile-.svg' },
]);
</script>

<style scoped>
/* 移除了之前的 filter 样式，因为现在我们直接切换图标文件 */
</style>