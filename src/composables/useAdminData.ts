import { computed, ref } from 'vue';
import { useReadContract, useAccount } from '@wagmi/vue';
import { formatEther, formatUnits } from 'viem';
import { abi } from '@/core/contract';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

/**
 * 管理员数据查询 Composable
 * 统一管理所有管理员相关的数据查询逻辑
 */
export const useAdminData = () => {
  const { address } = useAccount();

  // ========== 权限检查 ==========
  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'owner',
  });

  const isAdmin = computed(() => {
    return address.value && ownerAddress.value && 
           address.value.toLowerCase() === (ownerAddress.value as string).toLowerCase();
  });

  // ========== 创世节点数据 ==========
  const { data: pendingApps, refetch: refetchPending } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getPendingGenesisApplications',
  });

  const { data: activeNodesData, refetch: refetchActive } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getActiveGenesisNodes',
  });

  const { data: allNodesData, refetch: refetchAllNodes } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getAllGenesisNodes',
  });

  const { data: genesisNodesInfo, refetch: refetchGenesisInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getAllGenesisNodesInfo',
  });

  const pendingApplications = computed(() => (pendingApps.value as string[]) || []);
  const activeNodes = computed(() => (activeNodesData.value as string[]) || []);
  const allNodes = computed(() => (allNodesData.value as string[]) || []);

  // 创世节点详细信息
  const genesisNodesList = computed(() => {
    if (!genesisNodesInfo.value) return [];
    const info = genesisNodesInfo.value as any;
    const nodes = info[0] as string[];
    const totalDividends = info[1] as bigint[];
    const withdrawn = info[2] as bigint[];

    return nodes.map((address, index) => ({
      address,
      totalDividend: formatEther(totalDividends[index] || 0n),
      withdrawn: formatEther(withdrawn[index] || 0n),
      remaining: formatEther((totalDividends[index] || 0n) - (withdrawn[index] || 0n)),
      progress: Number(withdrawn[index] || 0n) / Number(totalDividends[index] || 1n) * 100,
      isActive: (activeNodesData.value as string[] || []).includes(address),
    }));
  });

  // ========== 全局统计数据 ==========
  const { data: globalStatsData, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getGlobalStats',
  });

  const { data: genesisPoolData, refetch: refetchGenesisPool } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'globalGenesisPool',
  });

  const globalStats = computed(() => {
    if (!globalStatsData.value) {
      return {
        totalStakedUsdt: '0',
        totalOrders: '0',
        totalGenesisNodes: '0',
        currentHafPrice: '1.000000',
        contractUsdtBalance: '0',
        contractHafBalance: '0',
        totalDepositedUsdt: '0',
        totalWithdrawnHaf: '0',
        totalFeeCollectedHaf: '0',
        totalHafDistributed: '0',
        activeUsers: '0',
        completedOrders: '0',
        genesisPool: '0',
      };
    }

    const data = globalStatsData.value as any;
    return {
      totalStakedUsdt: formatEther(data[0]),
      totalOrders: data[1].toString(),
      totalGenesisNodes: data[2].toString(),
      currentHafPrice: formatUnits(data[3], 18),
      contractUsdtBalance: formatEther(data[4]),
      contractHafBalance: formatEther(data[5]),
      totalDepositedUsdt: formatEther(data[6].totalDepositedUsdt),
      totalWithdrawnHaf: formatEther(data[6].totalWithdrawnHaf),
      totalFeeCollectedHaf: formatEther(data[6].totalFeeCollectedHaf),
      totalHafDistributed: formatEther(data[6].totalHafDistributed),
      activeUsers: data[6].totalActiveUsers.toString(),
      completedOrders: data[6].totalCompletedOrders.toString(),
      genesisPool: genesisPoolData.value ? formatEther(genesisPoolData.value as bigint) : '0',
    };
  });

  // ========== BTC数据 ==========
  const { data: btcStatsData, refetch: refetchBtcStats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getBtcStats',
  });

  const btcStats = computed(() => {
    if (!btcStatsData.value) {
      return {
        totalHashrate: '0',
        globalHashrate: '0',
        dailyRewardPerT: '0',
        currentDifficulty: '0',
        btcPrice: '0',
        nextHalvingTime: '0',
        totalMined: '0',
        yesterdayMined: '0',
        lastUpdateTime: '0',
      };
    }

    const data = btcStatsData.value as any;
    return {
      totalHashrate: formatEther(data.totalHashrate),
      globalHashrate: formatEther(data.globalHashrate),
      dailyRewardPerT: formatUnits(data.dailyRewardPerT, 6),
      currentDifficulty: data.currentDifficulty.toString(),
      btcPrice: formatUnits(data.btcPrice, 6),
      nextHalvingTime: data.nextHalvingTime.toString(),
      totalMined: formatEther(data.totalMined),
      yesterdayMined: formatEther(data.yesterdayMined),
      lastUpdateTime: data.lastUpdateTime.toString(),
    };
  });

  // ========== 价格与费率数据 ==========
  const { data: hafPriceData, refetch: refetchPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'hafPrice',
  });

  const { data: dailyRateData, refetch: refetchDailyRate } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'dailyPriceIncreaseRate',
  });

  const { data: autoPriceUpdateEnabled, refetch: refetchAutoPriceUpdate } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'autoPriceUpdateEnabled',
  });

  const { data: withdrawalFeeData, refetch: refetchWithdrawalFee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'withdrawalFeeRate',
  });

  const { data: swapFeeData, refetch: refetchSwapFee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'swapFeeRate',
  });

  const { data: genesisNodeCostData, refetch: refetchGenesisNodeCost } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'genesisNodeCost',
  });

  const { data: pausedData, refetch: refetchPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'paused',
  });

  const priceSettings = computed(() => ({
    currentPrice: hafPriceData.value ? formatUnits(hafPriceData.value as bigint, 18) : '0.00',
    dailyIncreaseRate: dailyRateData.value ? (dailyRateData.value as bigint).toString() : '0',
    autoUpdateEnabled: autoPriceUpdateEnabled.value as boolean || false,
  }));

  const feeSettings = computed(() => ({
    withdrawalFee: withdrawalFeeData.value ? Number(withdrawalFeeData.value as bigint) : 0,
    swapFee: swapFeeData.value ? Number(swapFeeData.value as bigint) : 0,
    genesisNodeCost: genesisNodeCostData.value ? formatEther(genesisNodeCostData.value as bigint) : '0',
  }));

  const systemStatus = computed(() => ({
    isPaused: pausedData.value as boolean || false,
  }));

  // ========== 质押级别数据 ==========
  const stakingLevels = ref<any[]>([]);
  const fetchStakingLevels = async () => {
    const levels = [];
    for (let i = 1; i <= 4; i++) {
      const { data } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'stakingLevels',
        args: [i],
      });
      if (data.value) {
        const level = data.value as any;
        levels.push({
          level: i,
          minAmount: formatEther(level.minAmount),
          maxAmount: formatEther(level.maxAmount),
          multiplier: Number(level.multiplier) / 100,
          dailyRate: Number(level.dailyRate) / 100,
        });
      }
    }
    stakingLevels.value = levels;
  };

  // ========== 团队级别数据 ==========
  const teamLevels = ref<any[]>([]);
  const fetchTeamLevels = async () => {
    const levels = [];
    for (let i = 0; i <= 5; i++) {
      const { data } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'teamLevels',
        args: [i],
      });
      if (data.value) {
        const level = data.value as any;
        levels.push({
          level: i,
          name: `V${i}`,
          requiredPerformance: formatEther(level.requiredPerformance),
          accelerationBonus: Number(level.accelerationBonus),
        });
      }
    }
    teamLevels.value = levels;
  };

  // ========== 统一刷新 ==========
  const refreshAll = async () => {
    await Promise.all([
      refetchPending(),
      refetchActive(),
      refetchAllNodes(),
      refetchGenesisInfo(),
      refetchStats(),
      refetchGenesisPool(),
      refetchBtcStats(),
      refetchPrice(),
      refetchDailyRate(),
      refetchAutoPriceUpdate(),
      refetchWithdrawalFee(),
      refetchSwapFee(),
      refetchGenesisNodeCost(),
      refetchPaused(),
    ]);
  };

  const refreshGenesisData = async () => {
    await Promise.all([
      refetchPending(),
      refetchActive(),
      refetchAllNodes(),
      refetchGenesisInfo(),
      refetchGenesisPool(),
    ]);
  };

  const refreshSystemData = async () => {
    await Promise.all([
      refetchPrice(),
      refetchDailyRate(),
      refetchAutoPriceUpdate(),
      refetchWithdrawalFee(),
      refetchSwapFee(),
      refetchGenesisNodeCost(),
      refetchPaused(),
    ]);
  };

  return {
    // 权限
    isAdmin,
    
    // 创世节点
    pendingApplications,
    activeNodes,
    allNodes,
    genesisNodesList,
    
    // 统计数据
    globalStats,
    btcStats,
    
    // 价格与费率
    priceSettings,
    feeSettings,
    systemStatus,
    
    // 级别配置
    stakingLevels,
    teamLevels,
    fetchStakingLevels,
    fetchTeamLevels,
    
    // 刷新方法
    refreshAll,
    refreshGenesisData,
    refreshSystemData,
    refetchStats,
    refetchBtcStats,
  };
};
