import { ref, watch, computed } from 'vue';
import { useAccount, useReadContract } from '@wagmi/vue';
import { formatUnits } from 'viem';
import { abi } from '@/core/contract';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// RewardType 枚举: 0=Static, 1=Direct, 2=Share, 3=Team, 4=Genesis
export type RewardType = 0 | 1 | 2 | 3 | 4;

export interface RewardRecord {
  timestamp: number;
  fromUser: string;
  rewardType: RewardType;
  usdtAmount: string;
  hafAmount: string;
  formattedDate: string;
}

/**
 * 使用合约查询用户收益记录
 */
export const useRewardRecords = () => {
  const { address } = useAccount();

  const rewardRecords = ref<RewardRecord[]>([]);

  /**
   * 查询收益记录（全部返回）
   */
  const { 
    data: rewardData, 
    isLoading: isLoadingRewards,
    refetch: refetchRewards,
    error: rewardError
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getUserRewardRecords',
    args: address.value ? [address.value] : undefined,
    query: {
      enabled: !!address.value,
    }
  });

  // 监听错误
  watch(() => rewardError.value, (error) => {
    if (error) {
      console.error('❌ Error fetching reward records:', error);
    }
  });

  // 处理收益记录数据
  watch(rewardData, (data) => {
    if (!data) {
      console.log('📊 No reward data received');
      return;
    }
    
    try {
      const records = data as any[];
      console.log(`📊 Total reward records: ${records.length}`, records);
      
      // 转换并倒序排列（最新的在前）
      rewardRecords.value = records.map((record: any) => {
        const timestamp = Number(record.timestamp);
        const date = new Date(timestamp * 1000);
        
        return {
          timestamp,
          fromUser: record.fromUser as string,
          rewardType: Number(record.rewardType) as RewardType,
          usdtAmount: formatUnits(record.usdtAmount, 18),
          hafAmount: formatUnits(record.hafAmount, 18),
          formattedDate: date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      }).reverse(); // 倒序：最新的在前
    } catch (error) {
      console.error('Error parsing reward records:', error);
    }
  }, { immediate: true });

  /**
   * 按类型筛选收益记录
   */
  const getRewardsByType = (type: RewardType | 'all') => {
    if (type === 'all') {
      return rewardRecords.value;
    }
    return rewardRecords.value.filter(record => record.rewardType === type);
  };

  /**
   * 统计各类型收益总额
   */
  const rewardSummary = computed(() => {
    const summary = {
      static: 0,
      direct: 0,
      share: 0,
      team: 0,
      genesis: 0,
      total: 0,
    };

    rewardRecords.value.forEach(record => {
      const amount = parseFloat(record.hafAmount);
      summary.total += amount;

      switch (record.rewardType) {
        case 0: summary.static += amount; break;
        case 1: summary.direct += amount; break;
        case 2: summary.share += amount; break;
        case 3: summary.team += amount; break;
        case 4: summary.genesis += amount; break;
      }
    });

    return summary;
  });

  // 监听地址变化
  watch(
    () => address.value,
    (newAddress) => {
      console.log('👤 Address changed:', newAddress);
      if (!newAddress) {
        rewardRecords.value = [];
      }
    }
  );

  return {
    rewardRecords,
    isLoadingRewards,
    rewardSummary,
    getRewardsByType,
    refetchRewards,
  };
};
