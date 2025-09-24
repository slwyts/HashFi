<template>
  <div class="flex flex-col h-screen bg-gray-100 font-sans">
    <TopBar />

    <main class="flex-grow overflow-y-auto">
      <router-view />
    </main>

    <BottomBar />
  </div>
</template>

<script setup lang="ts">
import TopBar from './components/TopBar.vue';
import BottomBar from './components/BottomBar.vue';
</script>

<style>
/* 全局样式 */
body {
  margin: 0;
  background-color: #f3f4f6; /* fallback for bg-gray-100 */
}
</style>