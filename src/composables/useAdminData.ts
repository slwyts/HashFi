import { computed, ref } from 'vue';
import { useReadContract, useAccount } from '@wagmi/vue';
import { formatEther, formatUnits } from 'viem';
import { abi, hafTokenAbi, erc20Abi } from '@/core/contract';
import { useBitcoinData } from './useBitcoinData';

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

  // 调试地址，即使不是合约管理员也可以访问 /admin (用于调试 worker API)
  const DEBUG_ADDRESS = '0xA4b76D7Cae384C9a5fD5f573Cef74BFdB980E966';

  const isAdmin = computed(() => {
    if (!address.value) return false;
    
    // 检查是否是调试地址
    if (address.value.toLowerCase() === DEBUG_ADDRESS.toLowerCase()) {
      return true;
    }
    
    // 检查是否是合约 owner
    return ownerAddress.value && 
           address.value.toLowerCase() === (ownerAddress.value as string).toLowerCase();
  });

  // ========== 创世节点数据 ==========
  // 对于带有 onlyOwner 修饰符的函数，需要以 owner 地址的身份调用
  const { data: pendingApps, refetch: refetchPending } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getPendingGenesisApplications',
    account: address,
    query: {
      enabled: () => !!isAdmin.value, // 只在管理员时启用查询
    }
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
    account: address,
    query: {
      enabled: () => !!isAdmin.value, // 只在管理员时启用查询
    }
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

  // ========== 全局统计 ==========
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

  // 查询 HAFToken 地址
  const { data: hafTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'hafToken',
  });

  // 查询 LP Pair 地址
  const { data: lpPairAddress } = useReadContract({
    address: hafTokenAddress as any,
    abi: hafTokenAbi,
    functionName: 'pancakePair',
    query: {
      enabled: computed(() => !!hafTokenAddress.value),
    }
  });

  // 查询 LP 余额 (LP token 由 HAFToken 合约持有)
  const { data: contractLpBalanceData, refetch: refetchLpBalance } = useReadContract({
    address: lpPairAddress as any,
    abi: erc20Abi, // LP Pair 是 ERC20 token
    functionName: 'balanceOf',
    args: computed(() => hafTokenAddress.value ? [hafTokenAddress.value] : undefined) as any,
    query: {
      enabled: computed(() => !!lpPairAddress.value && !!hafTokenAddress.value),
    }
  });

  // 查询 LP 池 USDT 储备量
  const { data: lpUsdtReserveData, refetch: refetchLpUsdtReserve } = useReadContract({
    address: hafTokenAddress as any,
    abi: hafTokenAbi,
    functionName: 'getLpUsdtBalance',
    query: {
      enabled: computed(() => !!hafTokenAddress.value),
    }
  });

  // 查询 LP 池 HAF 储备量
  const { data: lpHafReserveData, refetch: refetchLpHafReserve } = useReadContract({
    address: hafTokenAddress as any,
    abi: hafTokenAbi,
    functionName: 'getLpHafBalance',
    query: {
      enabled: computed(() => !!hafTokenAddress.value),
    }
  });

  const globalStats = computed(() => {
    // 解析 LP 数据
    const lpUsdtReserve = lpUsdtReserveData.value ? formatEther(lpUsdtReserveData.value as bigint) : '0';
    const lpHafReserve = lpHafReserveData.value ? formatEther(lpHafReserveData.value as bigint) : '0';
    const lpTokenBalance = contractLpBalanceData.value ? formatEther(contractLpBalanceData.value as bigint) : '0';
    
    if (!globalStatsData.value) {
      return {
        totalStakedUsdt: '0',
        totalOrders: '0',
        totalGenesisNodes: '0',
        currentHafPrice: '1.000000',
        contractUsdtBalance: '0',
        contractHafBalance: '0',
        lpUsdtReserve,
        lpHafReserve,
        lpTokenBalance,
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
      lpUsdtReserve,
      lpHafReserve,
      lpTokenBalance,
      totalDepositedUsdt: formatEther(data[6].totalDepositedUsdt),
      totalWithdrawnHaf: formatEther(data[6].totalWithdrawnHaf),
      totalFeeCollectedHaf: formatEther(data[6].totalFeeCollectedHaf),
      totalHafDistributed: formatEther(data[6].totalHafDistributed),
      activeUsers: data[6].totalActiveUsers.toString(),
      completedOrders: data[6].totalCompletedOrders.toString(),
      genesisPool: genesisPoolData.value ? formatEther(genesisPoolData.value as bigint) : '0',
    };
  });

  // ========== 价格与费率数据 ==========
  const { data: hafPriceData, refetch: refetchPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getHafPrice',
  });

  // const { data: dailyRateData, refetch: refetchDailyRate } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi,
  //   functionName: 'dailyPriceIncreaseRate',
  // });

  // const { data: autoPriceUpdateEnabled, refetch: refetchAutoPriceUpdate } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi,
  //   functionName: 'autoPriceUpdateEnabled',
  // });

  const { data: withdrawalFeeData, refetch: refetchWithdrawalFee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'withdrawalFeeRate',
  });

  // const { data: swapFeeData, refetch: refetchSwapFee } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi,
  //   functionName: 'swapFeeRate',
  // });

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

  // HAF 高级特性开关状态
  const { data: hafAdvancedFeaturesData, refetch: refetchHafAdvancedFeatures } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getHafAdvancedFeaturesEnabled',
  });

  const priceSettings = computed(() => ({
    currentPrice: hafPriceData.value ? formatUnits(hafPriceData.value as bigint, 18) : '0.00',
    // dailyIncreaseRate: dailyRateData.value ? (dailyRateData.value as bigint).toString() : '0',
    // autoUpdateEnabled: autoPriceUpdateEnabled.value as boolean || false,
  }));

  const feeSettings = computed(() => ({
    withdrawalFee: withdrawalFeeData.value ? Number(withdrawalFeeData.value as bigint) : 0,
    // swapFee: swapFeeData.value ? Number(swapFeeData.value as bigint) : 0,
    genesisNodeCost: genesisNodeCostData.value ? formatEther(genesisNodeCostData.value as bigint) : '0',
  }));

  const systemStatus = computed(() => ({
    isPaused: pausedData.value as boolean || false,
    hafAdvancedFeaturesEnabled: hafAdvancedFeaturesData.value as boolean ?? true,
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
      refetchLpBalance(),
      refetchLpUsdtReserve(),
      refetchLpHafReserve(),
      refetchPrice(),
      // refetchDailyRate(),
      // refetchAutoPriceUpdate(),
      refetchWithdrawalFee(),
      // refetchSwapFee(),
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
      // refetchDailyRate(),
      // refetchAutoPriceUpdate(),
      refetchWithdrawalFee(),
      // refetchSwapFee(),
      refetchGenesisNodeCost(),
      refetchPaused(),
      refetchHafAdvancedFeatures(),
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
  };
};
