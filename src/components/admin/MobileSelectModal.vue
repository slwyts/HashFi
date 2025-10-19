```vue
<template>
  <!-- Token Selector Modal -->
  <div v-if="show" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" @click="close">
    <div @click.stop class="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 class="text-lg font-bold text-gray-800">{{ title }}</h3>
        <button @click="close" class="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Option List -->
      <div class="overflow-y-auto">
        <div class="p-2">
          <div 
            v-for="option in options" 
            :key="String(option.value)"
            @click="select(option)"
            class="flex items-center p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors"
          >
            <div v-if="option.icon" class="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-xl">
              {{ option.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-800 truncate">{{ option.label }}</div>
              <div v-if="option.description" class="text-sm text-gray-500 truncate">{{ option.description }}</div>
            </div>
            <div v-if="isSelected(option)" class="w-5 h-5 text-blue-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from './CustomSelect.vue';

interface Props {
  show: boolean;
  options: SelectOption[];
  modelValue: string | number | boolean;
  title?: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'update:modelValue', value: string | number | boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '请选择'
});

const emit = defineEmits<Emits>();

const close = () => {
  emit('update:show', false);
};

const select = (option: SelectOption) => {
  emit('update:modelValue', option.value);
  close();
};

const isSelected = (option: SelectOption) => {
  return props.modelValue === option.value;
};
</script>
```