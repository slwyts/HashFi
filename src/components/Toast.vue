<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        :class="[
          'fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]',
          'px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm',
          'flex items-center gap-3 min-w-[300px] max-w-[500px]',
          'animate-slide-down',
          toastClasses
        ]"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <svg v-if="type === 'success'" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <svg v-else-if="type === 'error'" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <svg v-else-if="type === 'warning'" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>

        <!-- Message -->
        <div class="flex-1">
          <p class="font-medium text-sm leading-relaxed">{{ message }}</p>
        </div>

        <!-- Close Button -->
        <button
          @click="close"
          class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000,
  visible: false,
});

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(props.visible);
let timer: number | null = null;

const toastClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-800 text-white';
  }
});

const close = () => {
  visible.value = false;
  if (timer) clearTimeout(timer);
  emit('close');
};

watch(() => props.visible, (newVal) => {
  visible.value = newVal;
  
  if (newVal && props.duration > 0) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      close();
    }, props.duration);
  }
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
</style>
