import { computed, type Ref } from 'vue';
import { useAccount, useReadContract, useWriteContract, useSimulateContract } from '@wagmi/vue';
import { parseEther, type Address } from 'viem';
import HashFiArtifact from '../../artifacts/contracts/HashFi.sol/HashFi.json';
import HAFTokenArtifact from '../../artifacts/contracts/HAFToken.sol/HAFToken.json';

// 导出合约 ABI 供其他组件使用
export const abi = HashFiArtifact.abi;
export const hafTokenAbi = HAFTokenArtifact.abi;

// ERC20 标准 ABI（用于 USDT 等代币操作）
export const erc20Abi = [
  {
    "inputs": [{"internalType": "address","name": "spender","type": "address"},{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "owner","type": "address"},{"internalType": "address","name": "spender","type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "account","type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "to","type": "address"},{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "transfer",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// UniswapV2 Pair ABI（用于 LP 池 swap 操作）
export const uniswapV2PairAbi = [
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {"internalType": "uint112","name": "_reserve0","type": "uint112"},
      {"internalType": "uint112","name": "_reserve1","type": "uint112"},
      {"internalType": "uint32","name": "_blockTimestampLast","type": "uint32"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "amount0Out","type": "uint256"},
      {"internalType": "uint256","name": "amount1Out","type": "uint256"},
      {"internalType": "address","name": "to","type": "address"},
      {"internalType": "bytes","name": "data","type": "bytes"}
    ],
    "name": "swap",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sync",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// UniswapV2 Router ABI（用于一次性完成 swap）
export const uniswapV2RouterAbi = [
  {
    "inputs": [
      {"internalType": "uint256","name": "amountIn","type": "uint256"},
      {"internalType": "uint256","name": "amountOutMin","type": "uint256"},
      {"internalType": "address[]","name": "path","type": "address[]"},
      {"internalType": "address","name": "to","type": "address"},
      {"internalType": "uint256","name": "deadline","type": "uint256"}
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{"internalType": "uint256[]","name": "amounts","type": "uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "amountIn","type": "uint256"},
      {"internalType": "address[]","name": "path","type": "address[]"}
    ],
    "name": "getAmountsOut",
    "outputs": [{"internalType": "uint256[]","name": "amounts","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;


const HASHFI_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as Address | undefined;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as Address | undefined;
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID ? parseInt(import.meta.env.VITE_CHAIN_ID) : undefined;


if (!HASHFI_CONTRACT_ADDRESS) {
  throw new Error(
    "VITE_CONTRACT_ADDRESS is not defined. Please check your .env files (.env.development, .env.production)"
  );
}

if (!USDT_ADDRESS) {
  throw new Error(
    "VITE_USDT_ADDRESS is not defined. Please check your .env files (.env.development, .env.production)"
  );
}

if (!CHAIN_ID) {
  throw new Error(
    "VITE_CHAIN_ID is not defined. Please check your .env files (.env.development, .env.production)"
  );
}

// 导出地址供其他模块使用（非 undefined）
export const CONTRACT = HASHFI_CONTRACT_ADDRESS!;
export const USDT = USDT_ADDRESS!;

// --- 类型定义 ---
export interface Order { 
  id: number; 
  user: Address; 
  level: number; 
  amount: bigint; 
  totalQuota: bigint; 
  releasedQuota: bigint; 
  totalQuotaHaf: bigint; // 新增：总释放HAF额度
  releasedHaf: bigint;   // 新增：已释放HAF数量
  startTime: bigint; 
  lastSettleTime: bigint; 
  isCompleted: boolean; 
}
export interface TeamMemberInfo { memberAddress: Address; teamLevel: number; totalStakedAmount: bigint; teamTotalPerformance: bigint; }
export interface RewardRecord { timestamp: bigint; fromUser: Address; rewardType: number; usdtAmount: bigint; hafAmount: bigint; }
export interface UserInfo { referrer: Address; teamLevel: number; totalStakedAmount: bigint; teamTotalPerformance: bigint; directReferrals: Address[]; orderIds: bigint[]; isGenesisNode: boolean; genesisDividendsWithdrawn: bigint; dynamicRewardTotal: bigint; dynamicRewardReleased: bigint; lastDynamicUpdateTime: bigint; dynamicRewardClaimed: bigint; totalStaticOutput: bigint; rewardRecords: RewardRecord[]; }
export interface StakingLevelInfo { minAmount: bigint; maxAmount: bigint; multiplier: bigint; dailyRate: bigint; }
export interface TeamLevelInfo { requiredPerformance: bigint; accelerationBonus: bigint; }


/**
 * =================================================================================================
 * 合约读取 (Read Hooks)
 * =================================================================================================
 */

// --- 用户数据读取 ---
export function useUserInfo(userAddress?: Ref<Address | undefined>) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = computed(() => userAddress?.value || connectedAddress.value);
  return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getUserInfo', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
}

export function useUserOrders(userAddress?: Ref<Address | undefined>) {
    const { address: connectedAddress } = useAccount();
    const targetAddress = computed(() => userAddress?.value || connectedAddress.value);
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getUserOrders', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
}

export function useOrderInfo(orderId: Ref<number | undefined>) {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getOrderInfo', args: computed(() => (orderId.value !== undefined ? [orderId.value] : undefined)), query: { enabled: () => orderId.value !== undefined } });
}

export function useRewardRecords(userAddress?: Ref<Address | undefined>) {
    const { address: connectedAddress } = useAccount();
    const targetAddress = computed(() => userAddress?.value || connectedAddress.value);
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getUserRewardRecords', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
}

export function useDirectReferrals(userAddress?: Ref<Address | undefined>) {
    const { address: connectedAddress } = useAccount();
    const targetAddress = computed(() => userAddress?.value || connectedAddress.value);
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getDirectReferrals', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
}

export function useClaimableRewards(userAddress?: Ref<Address | undefined>) {
    const { address: connectedAddress } = useAccount();
    const targetAddress = computed(() => userAddress?.value || connectedAddress.value);
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getClaimableRewards', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
}

// --- 全局配置读取 ---

// 获取 HAF 价格（从LP池计算）
export function useHafPrice() {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getHafPrice' });
}

// 获取 HAFToken 合约地址
export function useHafTokenAddress() {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'hafToken' });
}

// 获取 LP Pair 地址
export function useLpPairAddress() {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getLpPairAddress' });
}

// 获取 LP 池储备量
export function useLpReserves(lpPairAddress: Ref<Address | undefined>) {
    return useReadContract({
        chainId: CHAIN_ID,
        abi: uniswapV2PairAbi,
        address: computed(() => lpPairAddress.value) as any,
        functionName: 'getReserves',
        query: { enabled: () => !!lpPairAddress.value, refetchInterval: 10000 }
    });
}

// 获取 LP 池 token0 地址
export function useLpToken0(lpPairAddress: Ref<Address | undefined>) {
    return useReadContract({
        chainId: CHAIN_ID,
        abi: uniswapV2PairAbi,
        address: computed(() => lpPairAddress.value) as any,
        functionName: 'token0',
        query: { enabled: () => !!lpPairAddress.value }
    });
}

export function useStakingLevelInfo(level: Ref<1 | 2 | 3 | 4>) {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'stakingLevels', args: computed(() => [level.value]), query: { enabled: () => !!level.value } });
}

export function useTeamLevelInfo(level: Ref<0 | 1 | 2 | 3 | 4 | 5>) {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'teamLevels', args: computed(() => [level.value]), query: { enabled: () => level.value !== undefined } });
}

export function useGlobalGenesisPool() {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'globalGenesisPool' });
}


/**
 * =================================================================================================
 * 合约写入 (Write Hooks)
 * =================================================================================================
 */

export function useStake(amount: Ref<number | null>): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    refetchSimulate: ReturnType<typeof useSimulateContract>['refetch'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
    hash: ReturnType<typeof useWriteContract>['data'];
} {
  const { data: config, error: simulateError, refetch } = useSimulateContract({
    address: HASHFI_CONTRACT_ADDRESS,
    abi,
    functionName: 'stake',
    args: computed(() => (amount.value && amount.value > 0 ? [parseEther(amount.value.toString())] : undefined)),
    query: { enabled: !!amount.value && amount.value > 0 },
    chainId: CHAIN_ID
  });
  const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
  return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

export function useBindReferrer(referrerAddress: Ref<Address | undefined>): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    refetchSimulate: ReturnType<typeof useSimulateContract>['refetch'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
    hash: ReturnType<typeof useWriteContract>['data'];
} {
    const { data: config, error: simulateError, refetch } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'bindReferrer',
        args: computed(() => (referrerAddress.value ? [referrerAddress.value] : undefined)),
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
    return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

export function useApplyForGenesisNode(): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    refetchSimulate: ReturnType<typeof useSimulateContract>['refetch'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
    hash: ReturnType<typeof useWriteContract>['data'];
} {
    const { data: config, error: simulateError, refetch } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'applyForGenesisNode',
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
    return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

export function useWithdraw(): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    refetchSimulate: ReturnType<typeof useSimulateContract>['refetch'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
    hash: ReturnType<typeof useWriteContract>['data'];
} {
    const { data: config, error: simulateError, refetch } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'withdraw',
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
    return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

/**
 * 统一的 swap 函数
 * @param tokenIn 支付的代币地址 (HAF 合约地址 或 USDT 地址)
 * @param amountIn 支付的数量
 */
// export function useSwap(tokenIn: Ref<Address | null>, amountIn: Ref<number | null>): {
//     config: ReturnType<typeof useSimulateContract>['data'];
//     simulateError: ReturnType<typeof useSimulateContract>['error'];
//     refetchSimulate: ReturnType<typeof useSimulateContract>['refetch'];
//     writeContract: ReturnType<typeof useWriteContract>['writeContract'];
//     isPending: ReturnType<typeof useWriteContract>['isPending'];
//     isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
//     writeError: ReturnType<typeof useWriteContract>['error'];
//     hash: ReturnType<typeof useWriteContract>['data'];
// } {
//     const { data: config, error: simulateError, refetch } = useSimulateContract({
//         address: HASHFI_CONTRACT_ADDRESS,
//         abi,
//         functionName: 'swap',
//         args: computed(() => {
//             if (!tokenIn.value || !amountIn.value || amountIn.value <= 0) {
//                 return undefined;
//             }
//             return [tokenIn.value, parseEther(amountIn.value.toString())] as const;
//         }),
//         chainId: CHAIN_ID
//     });
//     const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
//     return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
// }

/**
 * =================================================================================================
 * 合约管理 (Admin Hooks) - 仅限合约所有者调用
 * =================================================================================================
 */

// export function useSetHafPrice(newPrice: Ref<number | null>): {
//     config: ReturnType<typeof useSimulateContract>['data'];
//     simulateError: ReturnType<typeof useSimulateContract>['error'];
//     writeContract: ReturnType<typeof useWriteContract>['writeContract'];
//     isPending: ReturnType<typeof useWriteContract>['isPending'];
//     isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
//     writeError: ReturnType<typeof useWriteContract>['error'];
// } {
//     const { data: config, error: simulateError } = useSimulateContract({
//         address: HASHFI_CONTRACT_ADDRESS,
//         abi,
//         functionName: 'setHafPrice',
//         args: computed(() => (newPrice.value && newPrice.value > 0 ? [BigInt(Math.floor(newPrice.value * 1e6))] : undefined)), // 价格精度为 1e6
//         chainId: CHAIN_ID
//     });
//     const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
//     return { config, simulateError, writeContract, isPending, isSuccess, writeError };
// }

export function useSetWithdrawalFee(newFeeRate: Ref<number | null>): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
} {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'setWithdrawalFee',
        args: computed(() => (newFeeRate.value !== null ? [newFeeRate.value] : undefined)),
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}

export function usePause(): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
} {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS, abi, functionName: 'pause', chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}

export function useUnpause(): {
    config: ReturnType<typeof useSimulateContract>['data'];
    simulateError: ReturnType<typeof useSimulateContract>['error'];
    writeContract: ReturnType<typeof useWriteContract>['writeContract'];
    isPending: ReturnType<typeof useWriteContract>['isPending'];
    isSuccess: ReturnType<typeof useWriteContract>['isSuccess'];
    writeError: ReturnType<typeof useWriteContract>['error'];
} {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS, abi, functionName: 'unpause', chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}