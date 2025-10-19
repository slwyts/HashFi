import { ref, computed, watch } from 'vue';
import { useAccount, useBlockNumber, useConfig } from '@wagmi/vue';
import { getPublicClient } from '@wagmi/core';
import { formatUnits, type Log } from 'viem';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const DEPLOY_BLOCK = BigInt(import.meta.env.VITE_CONTRACT_DEPLOY_BLOCK || 0);
const API_URL = import.meta.env.VITE_API_URL || '';

// 每次查询的最大区块范围
const MAX_BLOCK_RANGE = 100000; // BSC Testnet 可以支持 9000+ 区块

// RewardType 枚举: 0=Static, 1=Direct, 2=Share, 3=Team, 4=Genesis
export type RewardType = 0 | 1 | 2 | 3 | 4;

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

interface RewardCache {
  address: string;
  contractAddress: string;  // ✅ 新增：合约地址
  lastBlockNumber: string;
  events: Array<Omit<RewardEvent, 'blockNumber'> & { blockNumber: string }>;
  updatedAt: string;
}

/**
 * 从 Workers 获取缓存的收益记录
 */
async function fetchCacheFromWorkers(address: string): Promise<RewardCache | null> {
  if (!API_URL) return null;
  
  try {
    // ✅ 请求时带上当前合约地址
    const url = `${API_URL}/reward-cache/${address}?contract=${CONTRACT_ADDRESS}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // ✅ Workers 会自动检查合约地址，如果不匹配会返回 null
    if (data.message) {
      console.log('💡', data.message);
    }
    
    return data.cache || null;
  } catch (error) {
    console.warn('Failed to fetch reward cache from Workers:', error);
    return null;
  }
}

/**
 * 上传收益记录到 Workers 缓存
 */
async function uploadCacheToWorkers(
  address: string,
  lastBlockNumber: bigint,
  events: RewardEvent[]
): Promise<void> {
  if (!API_URL) return;
  
  try {
    // ✅ 转换 bigint 为 string 并包含合约地址
    const cache: RewardCache = {
      address,
      contractAddress: CONTRACT_ADDRESS,  // ✅ 保存当前合约地址
      lastBlockNumber: lastBlockNumber.toString(),
      events: events.map(e => ({
        ...e,
        blockNumber: e.blockNumber.toString(),
      })),
      updatedAt: new Date().toISOString(),
    };
    
    await fetch(`${API_URL}/reward-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache),
    });
    
    console.log('✅ Reward cache uploaded to Workers');
  } catch (error) {
    console.warn('Failed to upload reward cache to Workers:', error);
  }
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
      console.log('🔍 Fetching reward events for user:', address.value);
      
      const endBlockNumber = toBlock === 'latest' || !toBlock 
        ? await publicClient.getBlockNumber() 
        : toBlock;
      
      // 🚀 优先从 Workers 缓存读取
      const cachedData = await fetchCacheFromWorkers(address.value);
      
      let startBlock = fromBlock || DEPLOY_BLOCK;
      let allEvents: RewardEvent[] = [];
      
      if (cachedData && cachedData.events.length > 0) {
        const cachedBlockNumber = BigInt(cachedData.lastBlockNumber);
        console.log(`✅ Found cache from block ${DEPLOY_BLOCK} to ${cachedBlockNumber}`);
        console.log(`📦 Cached events: ${cachedData.events.length}`);
        
        // 将缓存数据转换回 RewardEvent 格式
        allEvents = cachedData.events.map(e => ({
          ...e,
          blockNumber: BigInt(e.blockNumber),
        }));
        
        // 只查询缓存之后的新区块
        if (cachedBlockNumber < endBlockNumber) {
          startBlock = cachedBlockNumber + 1n;
          console.log(`🔄 Querying new events from block ${startBlock} to ${endBlockNumber}`);
        } else {
          // 缓存已是最新，直接使用
          console.log('✨ Cache is up-to-date, using cached data');
          rewardEvents.value = allEvents.sort((a, b) => b.timestamp - a.timestamp);
          isLoading.value = false;
          return;
        }
      } else {
        console.log(`🆕 No cache found, querying from deployment block ${DEPLOY_BLOCK}`);
      }
      
      // 🔗 查询新事件（从 startBlock 到 endBlockNumber）
      const blockRange = endBlockNumber - startBlock;
      const newLogs: any[] = [];
      
      if (blockRange <= MAX_BLOCK_RANGE) {
        // 单次查询
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
            user: address.value,
          },
          fromBlock: startBlock,
          toBlock: endBlockNumber,
        });
        newLogs.push(...logs);
      } else {
        // ✅ 分批查询
        console.log(`📊 Block range ${blockRange} exceeds limit, splitting into batches...`);
        
        let currentStart = startBlock;
        const batchCount = Math.ceil(Number(blockRange) / MAX_BLOCK_RANGE);
        
        for (let i = 0; i < batchCount; i++) {
          const currentEnd = currentStart + BigInt(MAX_BLOCK_RANGE) > endBlockNumber
            ? endBlockNumber
            : currentStart + BigInt(MAX_BLOCK_RANGE);
          
          console.log(`Batch ${i + 1}/${batchCount}: blocks ${currentStart} to ${currentEnd}`);
          
          try {
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
                user: address.value,
              },
              fromBlock: currentStart,
              toBlock: currentEnd,
            });
            
            newLogs.push(...logs);
            console.log(`Batch ${i + 1} found ${logs.length} events`);
          } catch (batchError) {
            console.error(`Error in batch ${i + 1}:`, batchError);
            // 继续处理下一批次，不中断整个查询
          }
          
          currentStart = currentEnd + 1n;
        }
      }

      console.log(`📝 New events found: ${newLogs.length}`);

      // 解析新事件日志
      const parsedNewEvents = await Promise.all(
        newLogs.map(async (log: any) => {
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

      // 合并缓存数据和新数据
      allEvents = [...allEvents, ...parsedNewEvents];
      
      // 按时间倒序排列
      rewardEvents.value = allEvents.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`✅ Total events: ${rewardEvents.value.length}`);
      
      // 🚀 如果成功查询到数据，上传到 Workers 缓存
      if (newLogs.length > 0 || cachedData) {
        await uploadCacheToWorkers(address.value, endBlockNumber, rewardEvents.value);
      }
    } catch (err: any) {
      console.error('❌ Error fetching reward events:', err);
      error.value = err.message || '获取收益记录失败';
      
      // 🔥 Fallback: 如果 RPC 查询失败，尝试只使用缓存数据
      const cachedData = await fetchCacheFromWorkers(address.value);
      if (cachedData && cachedData.events.length > 0) {
        console.log('⚠️ RPC failed, using cached data as fallback');
        rewardEvents.value = cachedData.events.map(e => ({
          ...e,
          blockNumber: BigInt(e.blockNumber),
        })).sort((a, b) => b.timestamp - a.timestamp);
      }
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
