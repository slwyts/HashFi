import { ref, watch } from 'vue';
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue';
import { transaction } from './useTransaction';
import { toast } from './useToast';

export interface ContractCallOptions {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
  onSuccess?: (hash: string) => Promise<void> | void;
  onError?: (error: any) => void;
  onConfirmed?: (receipt: any) => Promise<void> | void;
  successMessage?: string;
  pendingMessage?: string;
  errorMessage?: string;
  operation?: string;
}

export interface RefreshCallbacks {
  refreshBalance?: () => Promise<any>;
  refreshOrders?: () => Promise<any>;
  refreshAllowance?: () => Promise<any>;
  refreshUserInfo?: () => Promise<any>;
}

export const useEnhancedContract = () => {
  const { writeContractAsync } = useWriteContract();
  
  const currentTxHash = ref<string | null>(null);
  
  // 监听交易收据 - 修复：使用响应式的 currentTxHash
  const { data: receipt, isLoading, isSuccess, isError, error: receiptError } = useWaitForTransactionReceipt({
    hash: currentTxHash as any, // 传入响应式引用
  });

  // 监听交易状态变化
  watch([isSuccess, isError, receipt], async ([success, error, receiptData]) => {
    console.log('Transaction status change:', {
      success,
      error,
      receipt: receiptData,
      currentTxHash: currentTxHash.value
    });
    
    if (success && receiptData) {
      console.log('✅ Transaction confirmed successfully:', receiptData);
      // 交易确认成功
      transaction.setSuccess();
      
      // 执行成功回调
      if (currentOptions.value?.onConfirmed) {
        try {
          console.log('Executing success callback...');
          await currentOptions.value.onConfirmed(receiptData);
          console.log('Success callback completed');
        } catch (err) {
          console.error('Success callback error:', err);
        }
      }
      
      // 重置状态
      currentTxHash.value = null;
      currentOptions.value = null;
    } else if (error && receiptError.value) {
      console.log('❌ Transaction failed:', receiptError.value);
      // 交易确认失败
      transaction.setError(receiptError.value.message || '交易失败');
      
      // 执行错误回调
      if (currentOptions.value?.onError) {
        currentOptions.value.onError(receiptError.value);
      }
      
      // 重置状态
      currentTxHash.value = null;
      currentOptions.value = null;
    }
  });

  const currentOptions = ref<ContractCallOptions | null>(null);

  const callContract = async (options: ContractCallOptions, refreshCallbacks?: RefreshCallbacks) => {
    try {
      // 开始交易
      transaction.start(options.operation || 'Transaction');
      currentOptions.value = options;

      // 显示发送交易的提示
      if (options.pendingMessage) {
        toast.info(options.pendingMessage);
      }

      // 调用合约
      const hash = await writeContractAsync({
        address: options.address,
        abi: options.abi,
        functionName: options.functionName,
        args: options.args || [],
      });

      // 交易发送成功，开始等待确认
      transaction.setPending(hash);
      currentTxHash.value = hash;

      // 执行成功回调
      if (options.onSuccess) {
        await options.onSuccess(hash);
      }

      // 返回交易哈希
      return hash;

    } catch (error: any) {
      console.error('Contract call error:', error);
      
      // 处理用户拒绝交易的情况
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        transaction.reset();
        return null;
      }

      // 处理其他错误
      const errorMessage = options.errorMessage || 
                          error.shortMessage || 
                          error.message || 
                          '交易失败';
      
      transaction.setError(errorMessage);
      
      if (options.onError) {
        options.onError(error);
      }
      
      // 重置状态
      currentTxHash.value = null;
      currentOptions.value = null;
      
      throw error;
    }
  };

  // 便捷方法：调用合约并自动刷新数据
  const callContractWithRefresh = async (
    options: ContractCallOptions, 
    refreshCallbacks: RefreshCallbacks
  ) => {
    const enhancedOptions = {
      ...options,
      onConfirmed: async (receipt: any) => {
        // 执行原始回调
        if (options.onConfirmed) {
          await options.onConfirmed(receipt);
        }
        
        // 自动刷新数据
        const refreshPromises = [];
        if (refreshCallbacks.refreshBalance) refreshPromises.push(refreshCallbacks.refreshBalance());
        if (refreshCallbacks.refreshOrders) refreshPromises.push(refreshCallbacks.refreshOrders());
        if (refreshCallbacks.refreshAllowance) refreshPromises.push(refreshCallbacks.refreshAllowance());
        if (refreshCallbacks.refreshUserInfo) refreshPromises.push(refreshCallbacks.refreshUserInfo());
        
        // 并行执行所有刷新操作
        if (refreshPromises.length > 0) {
          try {
            await Promise.all(refreshPromises);
          } catch (err) {
            console.error('Data refresh error:', err);
          }
        }
      }
    };

    return callContract(enhancedOptions, refreshCallbacks);
  };

  return {
    callContract,
    callContractWithRefresh,
    isProcessing: transaction.isProcessing,
    transactionState: transaction.state,
  };
};