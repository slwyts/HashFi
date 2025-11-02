import { ref, watch } from 'vue';
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue';
import { transaction } from './useTransaction';
import { toast } from './useToast';

// 合约错误信息映射
const CONTRACT_ERRORS: Record<string, string> = {
  'InvalidAddress': '无效的地址',
  'InvalidAmount': '无效的数量',
  'ReferrerAlreadyBound': '已绑定推荐人',
  'ReferrerNotExist': '推荐人不存在',
  'CannotReferSelf': '不能推荐自己',
  'MustBindReferrer': '必须先绑定推荐人',
  'InvalidStakingAmount': '质押数量无效',
  'AlreadyGenesisNode': '已经是创世节点',
  'ApplicationPending': '申请审核中',
  'NoRewards': '没有可领取的奖励',
  'BelowMinimum': '低于最小数量',
  'AddressNotSet': '未设置地址',
  'InsufficientBalance': '余额不足',
  'InvalidOrder': '无效的订单',
  'AlreadyProcessed': '订单已处理',
  'NoPendingApplication': '没有待处理的申请',
  'InvalidLevel': '无效的等级',
  'InvalidFeeRate': '无效的费率',
};

// 解析合约错误信息
const parseContractError = (error: any): string => {
  const errorStr = error?.message || error?.toString() || '';
  
  // 尝试从错误消息中提取合约错误名称
  for (const [errorName, message] of Object.entries(CONTRACT_ERRORS)) {
    if (errorStr.includes(errorName)) {
      return message;
    }
  }
  
  // 检查是否是 revert 错误
  if (errorStr.includes('reverted') || errorStr.includes('revert')) {
    // 尝试提取 revert 原因
    const revertMatch = errorStr.match(/reverted with reason string '([^']+)'/);
    if (revertMatch) {
      return revertMatch[1];
    }
    return '交易被合约拒绝';
  }
  
  // 检查常见的用户操作错误
  if (errorStr.includes('User rejected') || errorStr.includes('user rejected')) {
    return '用户取消交易';
  }
  
  if (errorStr.includes('insufficient funds')) {
    return '账户余额不足';
  }
  
  // 返回简短的错误信息
  if (error?.shortMessage) {
    return error.shortMessage;
  }
  
  return '交易失败';
};

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
      
      // 解析交易失败的具体原因
      const parsedError = parseContractError(receiptError.value);
      const errorMessage = currentOptions.value?.errorMessage 
        ? `${currentOptions.value.errorMessage}: ${parsedError}` 
        : parsedError;
      
      // 交易确认失败
      transaction.setError(errorMessage);
      
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

      // 解析合约错误信息
      const parsedError = parseContractError(error);
      const errorMessage = options.errorMessage 
        ? `${options.errorMessage}: ${parsedError}` 
        : parsedError;
      
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