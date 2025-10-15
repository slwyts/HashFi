import { ref, computed, watch } from 'vue';
import { useAccount, useBlockNumber, useConfig } from '@wagmi/vue';
import { getPublicClient } from '@wagmi/core';
import { formatUnits, type Log } from 'viem';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const DEPLOY_BLOCK = BigInt(import.meta.env.VITE_CONTRACT_DEPLOY_BLOCK || 0);

// RewardType 枚举: 0=Static, 1=Direct, 2=Share, 3=Team
export type RewardType = 0 | 1 | 2 | 3;

export interface RewardEvent {
  timestamp: number;
  blockNumber: bigint;
  transactionHash: string;
  fromUser: string;
  rewardType: RewardType;
  usdtAmount: string;
  hafAmount: string;
  formattedDate: string;
}

/**
 * 监听和查询用户的收益事件记录
 */
export const useRewardEvents = () => {
  const { address } = useAccount();
  const config = useConfig();

  const rewardEvents = ref<RewardEvent[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 查询历史收益事件
   * @param fromBlock 起始区块（默认从合约部署开始）
   * @param toBlock 结束区块（默认到最新区块）
   */
  const fetchRewardEvents = async (fromBlock?: bigint, toBlock?: bigint | 'latest') => {
    if (!address.value) {
      console.warn('Account not ready');
      return;
    }

    const publicClient = getPublicClient(config);
    if (!publicClient) {
      console.warn('Public client not ready');
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      console.log('Fetching reward events for user:', address.value);
      
      // ✅ 从合约部署区块开始查询
      const startBlock = fromBlock || DEPLOY_BLOCK;
      const endBlock = toBlock || 'latest';
      
      console.log(`Querying events from block ${startBlock} to ${endBlock}`);
      
      // 获取 RewardDistributed 事件日志
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: {
          type: 'event',
          name: 'RewardDistributed',
          inputs: [
            { type: 'address', indexed: true, name: 'user' },
            { type: 'address', indexed: true, name: 'fromUser' },
            { type: 'uint8', indexed: false, name: 'rewardType' },
            { type: 'uint256', indexed: false, name: 'usdtAmount' },
            { type: 'uint256', indexed: false, name: 'hafAmount' },
          ],
        },
        args: {
          user: address.value, // 过滤当前用户的事件
        },
        fromBlock: startBlock,
        toBlock: endBlock,
      });

      console.log('Found events:', logs.length);

      // 解析事件日志
      const parsedEvents = await Promise.all(
        logs.map(async (log: any) => {
          // 获取区块信息以获取时间戳
          const block = await publicClient.getBlock({ 
            blockNumber: log.blockNumber 
          });

          const timestamp = Number(block.timestamp);
          const date = new Date(timestamp * 1000);

          return {
            timestamp,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            fromUser: log.args.fromUser as string,
            rewardType: Number(log.args.rewardType) as RewardType,
            usdtAmount: formatUnits(log.args.usdtAmount as bigint, 18),
            hafAmount: formatUnits(log.args.hafAmount as bigint, 18),
            formattedDate: date.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          } as RewardEvent;
        })
      );

      // 按时间倒序排列
      rewardEvents.value = parsedEvents.sort((a: RewardEvent, b: RewardEvent) => b.timestamp - a.timestamp);
      
      console.log('Parsed reward events:', rewardEvents.value.length);
    } catch (err: any) {
      console.error('Error fetching reward events:', err);
      error.value = err.message || '获取收益记录失败';
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 按类型筛选事件
   */
  const getEventsByType = (type: RewardType | 'all') => {
    if (type === 'all') {
      return rewardEvents.value;
    }
    return rewardEvents.value.filter(event => event.rewardType === type);
  };

  /**
   * 统计各类型收益总额
   */
  const rewardStats = computed(() => {
    const stats = {
      total: { usdt: 0, haf: 0 },
      static: { usdt: 0, haf: 0 },
      direct: { usdt: 0, haf: 0 },
      share: { usdt: 0, haf: 0 },
      team: { usdt: 0, haf: 0 },
    };

    rewardEvents.value.forEach(event => {
      const usdt = parseFloat(event.usdtAmount);
      const haf = parseFloat(event.hafAmount);

      stats.total.usdt += usdt;
      stats.total.haf += haf;

      switch (event.rewardType) {
        case 0: // Static
          stats.static.usdt += usdt;
          stats.static.haf += haf;
          break;
        case 1: // Direct
          stats.direct.usdt += usdt;
          stats.direct.haf += haf;
          break;
        case 2: // Share
          stats.share.usdt += usdt;
          stats.share.haf += haf;
          break;
        case 3: // Team
          stats.team.usdt += usdt;
          stats.team.haf += haf;
          break;
      }
    });

    return stats;
  });

  /**
   * 实时监听新事件
   */
  const startWatching = () => {
    const publicClient = getPublicClient(config);
    if (!publicClient) return;

    console.log('Starting to watch for new reward events...');

    const unwatch = publicClient.watchEvent({
      address: CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'RewardDistributed',
        inputs: [
          { type: 'address', indexed: true, name: 'user' },
          { type: 'address', indexed: true, name: 'fromUser' },
          { type: 'uint8', indexed: false, name: 'rewardType' },
          { type: 'uint256', indexed: false, name: 'usdtAmount' },
          { type: 'uint256', indexed: false, name: 'hafAmount' },
        ],
      },
      args: {
        user: address.value,
      },
      onLogs: async (logs: any[]) => {
        console.log('New reward event detected:', logs);
        
        // 重新获取所有事件（或者只添加新事件）
        await fetchRewardEvents();
      },
    });

    return unwatch;
  };

  // 监听地址变化，自动重新获取
  watch(
    () => address.value,
    (newAddress) => {
      if (newAddress) {
        fetchRewardEvents();
      } else {
        rewardEvents.value = [];
      }
    },
    { immediate: true }
  );

  return {
    rewardEvents,
    isLoading,
    error,
    rewardStats,
    fetchRewardEvents,
    getEventsByType,
    startWatching,
  };
};
