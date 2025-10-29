<template>
  <div
    v-if="show"
    @click.self="$emit('close')"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4"
  >
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[80vh] flex flex-col">
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="text-lg font-bold">{{ title }}</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
      </div>

      <div class="p-5 overflow-y-auto" v-html="content">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义 props
defineProps<{
  show: boolean;
  title: string;
  content: string;
}>();

// 定义 emits
defineEmits(['close']);
</script>