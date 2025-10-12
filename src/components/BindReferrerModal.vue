<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-slide-up">
          <!-- Header -->
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-gray-800">{{ t('profilePage.bindReferrerTitle') }}</h3>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 已绑定状态 -->
          <div v-if="isReferrerBound" class="text-center py-8">
            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <p class="text-lg font-semibold text-gray-800 mb-2">您已绑定推荐人</p>
            <p class="text-sm text-gray-600 mb-4">
              {{ referrerDisplayName }}
            </p>
            <p class="text-xs text-gray-500">💡 推荐人绑定后不可更改</p>
          </div>

          <!-- 未绑定 - 绑定表单 -->
          <div v-else>
            <!-- 默认推荐人提示 -->
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-800 mb-1">
                    {{ t('profilePage.defaultReferrerHint') }}
                  </p>
                  <button
                    @click="useDefaultReferrer"
                    class="text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
                  >
                    {{ t('profilePage.useDefaultReferrer') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 输入推荐人地址 -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('profilePage.referrerAddress') }}
              </label>
              <input
                v-model="referrerAddress"
                type="text"
                :placeholder="t('profilePage.enterReferrerAddress')"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
              />
              <p class="text-xs text-gray-500 mt-2">
                请输入邀请您的用户地址，或使用默认推荐人
              </p>
            </div>

            <!-- 按钮组 -->
            <div class="flex gap-3">
              <button
                @click="$emit('close')"
                class="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                取消
              </button>
              <button
                @click="handleBind"
                :disabled="!referrerAddress || isProcessing()"
                class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                {{ isProcessing() ? t('profilePage.binding') : t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from '@/composables/useToast';
import { useEnhancedContract } from '@/composables/useEnhancedContract';
import { abi } from '@/core/contract';

const { t } = useI18n();

interface Props {
  visible: boolean;
  ownerAddress?: string;
  currentReferrer?: string;
  inviteAddress?: string; // 新增：来自邀请链接的地址
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const { callContractWithRefresh, isProcessing } = useEnhancedContract();

const referrerAddress = ref('');

// 检查是否已绑定推荐人
const isReferrerBound = computed(() => {
  return props.currentReferrer && props.currentReferrer !== '0x0000000000000000000000000000000000000000';
});

// 推荐人显示名称
const referrerDisplayName = computed(() => {
  if (!props.currentReferrer) return '';
  
  // 如果是 owner，显示"平台官方"
  if (props.ownerAddress && props.currentReferrer.toLowerCase() === props.ownerAddress.toLowerCase()) {
    return '平台官方 (Platform Official)';
  }
  
  // 显示简化地址
  return `${props.currentReferrer.substring(0, 6)}...${props.currentReferrer.substring(38)}`;
});

// 使用默认推荐人（owner）
const useDefaultReferrer = () => {
  if (props.ownerAddress) {
    referrerAddress.value = props.ownerAddress;
    toast.info('已选择平台默认推荐人');
  }
};

// 绑定推荐人
const handleBind = async () => {
  if (!referrerAddress.value) {
    toast.error(t('profilePage.enterReferrerAddress'));
    return;
  }

  // 验证地址格式
  if (!/^0x[a-fA-F0-9]{40}$/.test(referrerAddress.value)) {
    toast.error('推荐人地址格式不正确');
    return;
  }

  try {
    await callContractWithRefresh(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'bindReferrer',
        args: [referrerAddress.value as `0x${string}`],
        pendingMessage: t('profilePage.binding'),
        successMessage: t('profilePage.bindSuccess'),
        operation: 'Bind Referrer',
        onConfirmed: () => {
          emit('success');
          emit('close');
        }
      },
      {} // 不需要数据刷新，因为父组件会处理
    );

  } catch (error: any) {
    console.error('Bind referrer error:', error);

    // 友好错误处理
    if (error.message?.includes('Referrer already bound')) {
      toast.error(t('profilePage.alreadyBound'));
    } else if (error.message?.includes('Referrer does not exist')) {
      toast.error(t('profilePage.referrerNotExist'));
    } else if (error.message?.includes('Cannot refer yourself')) {
      toast.error(t('profilePage.cannotReferSelf'));
    }
    // 其他错误已经在 useEnhancedContract 中处理
  }
};

// 监听 visible 变化，打开时尝试填充推荐人地址
watch(() => props.visible, (newVal) => {
  if (newVal && !isReferrerBound.value) {
    // 优先使用来自邀请链接的地址
    if (props.inviteAddress) {
      referrerAddress.value = props.inviteAddress;
      toast.info('已从邀请链接自动填入推荐人地址');
      return;
    }
    
    // 如果没有邀请链接，不自动填充默认推荐人，让用户选择
    referrerAddress.value = '';
  }
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white {
  transform: scale(0.95) translateY(20px);
}

.modal-leave-to .bg-white {
  transform: scale(0.95) translateY(20px);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
