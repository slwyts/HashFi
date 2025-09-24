<template>
  <footer class="bg-white shadow-md">
    <nav class="flex justify-around">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-full py-2 text-gray-500"
        active-class="text-blue-600"
      >
        <img :src="item.icon" alt="" class="w-6 h-6 mb-1" />
        <span class="text-xs">{{ t(item.label) }}</span>
      </router-link>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const navItems = computed(() => [
  { path: '/staking', label: 'bottomNav.staking', icon: '/icons/staking.svg' },
  { path: '/income', label: 'bottomNav.income', icon: '/icons/income.svg' },
  { path: '/swap', label: 'bottomNav.swap', icon: '/icons/flash_exchange.svg' },
  { path: '/team', label: 'bottomNav.team', icon: '/icons/ecosystem.svg' },
  { path: '/profile', label: 'bottomNav.profile', icon: '/icons/profile.svg' },
]);
</script>

<style scoped>
/* 活动链接的图标颜色会通过CSS过滤器改变 */
.router-link-active img {
  filter: invert(39%) sepia(80%) saturate(1413%) hue-rotate(205deg) brightness(90%) contrast(96%);
}
</style>