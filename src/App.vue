<template>
  <div class="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
    <TopBar />

    <main class="flex-grow overflow-y-auto">
      <router-view />
    </main>

    <BottomBar />

    <!-- 全局 Toast -->
    <Toast :visible="toastState.visible" :message="toastState.message" :type="toastState.type" :duration="toastState.duration" @close="toast.close" />
  </div>
</template>

<script setup lang="ts">
import TopBar from "./components/TopBar.vue";
import BottomBar from "./components/BottomBar.vue";
import Toast from "./components/Toast.vue";
import { toast } from "./composables/useToast";

const toastState = toast.state;
</script>

<style>
/* 全局样式 */
body {
  margin: 0;
}
</style>
