<template>
  <div class="relative" ref="selectRef">
    <button
      type="button"
      @click="toggleDropdown"
      class="w-full px-4 py-3 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      :class="{ 'border-blue-500': isOpen }"
    >
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2">
          <span v-if="selectedOption?.icon" class="text-lg">{{ selectedOption.icon }}</span>
          <span :class="selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'">
            {{ selectedOption ? selectedOption.label : placeholder }}
          </span>
        </span>
        <svg 
          class="w-5 h-5 text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- 下拉菜单 -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto"
      >
        <div
          v-for="option in options"
          :key="String(option.value)"
          @click="selectOption(option)"
          class="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-3"
          :class="{
            'bg-blue-50 text-blue-700': modelValue === option.value,
            'text-gray-700': modelValue !== option.value
          }"
        >
          <span v-if="option.icon" class="text-lg">{{ option.icon }}</span>
          <div class="flex-1">
            <div class="font-medium">{{ option.label }}</div>
            <div v-if="option.description" class="text-xs text-gray-500 mt-0.5">
              {{ option.description }}
            </div>
          </div>
          <svg
            v-if="modelValue === option.value"
            class="w-5 h-5 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface SelectOption {
  value: string | number | boolean;
  label: string;
  icon?: string;
  description?: string;
}

interface Props {
  modelValue: string | number | boolean;
  options: SelectOption[];
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string | number | boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择'
});

const emit = defineEmits<Emits>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue);
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const selectOption = (option: SelectOption) => {
  emit('update:modelValue', option.value);
  isOpen.value = false;
};

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
