import { ref, reactive } from 'vue';
import { useWaitForTransactionReceipt } from '@wagmi/vue';
import { toast } from './useToast';

export type TransactionStatus = 'idle' | 'pending' | 'waiting' | 'success' | 'error';

interface TransactionState {
  status: TransactionStatus;
  hash: string | null;
  error: string | null;
  operation: string | null;
}

const state = reactive<TransactionState>({
  status: 'idle',
  hash: null,
  error: null,
  operation: null,
});

// 全局的交易管理器
export const useTransaction = () => {
  const reset = () => {
    state.status = 'idle';
    state.hash = null;
    state.error = null;
    state.operation = null;
    toast.close();
  };

  const start = (operation: string) => {
    state.status = 'pending';
    state.operation = operation;
    state.hash = null;
    state.error = null;
    toast.close();
  };

  const setPending = (hash: string) => {
    state.status = 'waiting';
    state.hash = hash;
    // 显示等待区块确认的 toast
    toast.waiting('等待区块确认...', 0); // 0 duration 表示不自动消失
  };

  const setSuccess = (successMessage?: string) => {
    state.status = 'success';
    toast.close(); // 先关闭等待的 toast
    setTimeout(() => {
      toast.success(successMessage || '交易成功');
    }, 100);
  };

  const setError = (error: string) => {
    state.status = 'error';
    state.error = error;
    toast.close(); // 先关闭等待的 toast
    setTimeout(() => {
      toast.error(error);
    }, 100);
  };

  const isProcessing = () => {
    return state.status === 'pending' || state.status === 'waiting';
  };

  return {
    state,
    reset,
    start,
    setPending,
    setSuccess,
    setError,
    isProcessing,
  };
};

// 全局单例
export const transaction = useTransaction();

// 用于监听交易收据的 hook
export const useTransactionReceipt = (txHash: string | null) => {
  const { data: receipt, isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  return {
    receipt,
    isLoading,
    isSuccess,
    isError,
    error,
  };
};