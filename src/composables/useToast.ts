import { reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'waiting';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
}

const state = reactive<ToastState>({
  visible: false,
  message: '',
  type: 'info',
  duration: 3000,
});

let closeTimer: number | null = null;

export const useToast = () => {
  const show = (message: string, type: ToastType = 'info', duration = 3000) => {
    // 清除之前的定时器
    if (closeTimer) {
      clearTimeout(closeTimer);
    }

    // 设置新的 toast
    state.message = message;
    state.type = type;
    state.duration = duration;
    state.visible = true;

    // 自动关闭
    if (duration > 0) {
      closeTimer = window.setTimeout(() => {
        state.visible = false;
      }, duration);
    }
  };

  const success = (message: string, duration = 3000) => {
    show(message, 'success', duration);
  };

  const error = (message: string, duration = 3000) => {
    show(message, 'error', duration);
  };

  const warning = (message: string, duration = 3000) => {
    show(message, 'warning', duration);
  };

  const info = (message: string, duration = 3000) => {
    show(message, 'info', duration);
  };

  const waiting = (message: string, duration = 0) => {
    show(message, 'waiting', duration);
  };

  const close = () => {
    state.visible = false;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  return {
    state,
    show,
    success,
    error,
    warning,
    info,
    waiting,
    close,
  };
};

// 全局单例
export const toast = useToast();
