import { computed, type Ref } from 'vue';
import { useAccount, useReadContract, useWriteContract, useSimulateContract } from '@wagmi/vue';
import { parseEther, type Address } from 'viem';
import HashFiArtifact from '../../artifacts/contracts/HashFi.sol/HashFi.json';

// 导出合约 ABI 供其他组件使用
export const abi = HashFiArtifact.abi;

// ERC20 标准 ABI（用于 USDT 等代币的 approve 和 allowance 操作）
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
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'getRewardRecords', args: computed(() => (targetAddress.value ? [targetAddress.value] : undefined)), query: { enabled: () => !!targetAddress.value } });
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
export function useHafPrice() {
    return useReadContract({ chainId: CHAIN_ID, abi, address: HASHFI_CONTRACT_ADDRESS, functionName: 'hafPrice' });
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

export function useStake(amount: Ref<number | null>) {
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

export function useBindReferrer(referrerAddress: Ref<Address | undefined>) {
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

export function useApplyForGenesisNode() {
    const { data: config, error: simulateError, refetch } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'applyForGenesisNode',
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
    return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

export function useWithdraw() {
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
export function useSwap(tokenIn: Ref<Address | null>, amountIn: Ref<number | null>) {
    const { data: config, error: simulateError, refetch } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'swap',
        args: computed(() => {
            if (!tokenIn.value || !amountIn.value || amountIn.value <= 0) {
                return undefined;
            }
            return [tokenIn.value, parseEther(amountIn.value.toString())] as const;
        }),
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError, data: hash } = useWriteContract();
    return { config, simulateError, refetchSimulate: refetch, writeContract, isPending, isSuccess, writeError, hash };
}

/**
 * =================================================================================================
 * 合约管理 (Admin Hooks) - 仅限合约所有者调用
 * =================================================================================================
 */

export function useSetHafPrice(newPrice: Ref<number | null>) {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS,
        abi,
        functionName: 'setHafPrice',
        args: computed(() => (newPrice.value && newPrice.value > 0 ? [BigInt(Math.floor(newPrice.value * 1e6))] : undefined)), // 价格精度为 1e6
        chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}

export function useSetWithdrawalFee(newFeeRate: Ref<number | null>) {
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

export function usePause() {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS, abi, functionName: 'pause', chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}

export function useUnpause() {
    const { data: config, error: simulateError } = useSimulateContract({
        address: HASHFI_CONTRACT_ADDRESS, abi, functionName: 'unpause', chainId: CHAIN_ID
    });
    const { writeContract, isPending, isSuccess, error: writeError } = useWriteContract();
    return { config, simulateError, writeContract, isPending, isSuccess, writeError };
}