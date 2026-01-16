import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Chain,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, bscTestnet } from 'viem/chains';

// Environment interface
interface Env {
  RPC_URL: string;
  PRIVATE_KEY: string;
  HAF_TOKEN_ADDRESS: string;
  CHAIN_ID: string;
}

// HAFToken minimal ABI for transfer
const HAF_TOKEN_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function triggerMechanismsExternal() external',
]);

// Get chain config by chain ID
function getChain(chainId: number): Chain {
  switch (chainId) {
    case 56:
      return bsc;
    case 97:
      return bscTestnet;
    default:
      // Custom chain for other networks
      return {
        id: chainId,
        name: `Chain ${chainId}`,
        nativeCurrency: {
          decimals: 18,
          name: 'Native',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: { http: [] },
        },
      } as Chain;
  }
}

// Get UTC+8 time string for logging
function getUTC8TimeString(): string {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().replace('T', ' ').substring(0, 19) + ' UTC+8';
}

// Main trigger function
async function triggerHAFToken(env: Env): Promise<{ 
  success: boolean; 
  message: string; 
  txHash?: string;
  bscscanUrl?: string;
  details?: {
    from: string;
    to: string;
    amount: string;
    method: string;
    chainId: number;
    tokenAddress: string;
    blockNumber?: string;
    timestamp: string;
  }
}> {
  const timeStr = getUTC8TimeString();
  console.log(`[${timeStr}] Starting HAFToken trigger...`);

  // Validate environment
  if (!env.RPC_URL || !env.PRIVATE_KEY || !env.HAF_TOKEN_ADDRESS || !env.CHAIN_ID) {
    throw new Error('Missing required environment variables: RPC_URL, PRIVATE_KEY, HAF_TOKEN_ADDRESS, CHAIN_ID');
  }

  const chainId = parseInt(env.CHAIN_ID, 10);
  const chain = getChain(chainId);
  const hafTokenAddress = env.HAF_TOKEN_ADDRESS as Address;

  // Create account from private key
  const privateKey = env.PRIVATE_KEY.startsWith('0x')
    ? (env.PRIVATE_KEY as Hex)
    : (`0x${env.PRIVATE_KEY}` as Hex);
  const account = privateKeyToAccount(privateKey);

  console.log(`[${timeStr}] Wallet address: ${account.address}`);
  console.log(`[${timeStr}] Chain ID: ${chainId}`);
  console.log(`[${timeStr}] HAF Token: ${hafTokenAddress}`);

  // Create clients
  const publicClient = createPublicClient({
    chain,
    transport: http(env.RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(env.RPC_URL),
  });

  // Check HAF balance
  const balance = await publicClient.readContract({
    address: hafTokenAddress,
    abi: HAF_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log(`[${timeStr}] HAF Balance: ${balance}`);

  // We need at least 1 wei to transfer to trigger mechanisms
  // If balance is 0, try to call triggerMechanismsExternal directly
  if (balance === 0n) {
    console.log(`[${timeStr}] No HAF balance, calling triggerMechanismsExternal directly...`);
    
    const hash = await walletClient.writeContract({
      address: hafTokenAddress,
      abi: HAF_TOKEN_ABI,
      functionName: 'triggerMechanismsExternal',
      args: [],
    });

    console.log(`[${timeStr}] triggerMechanismsExternal tx hash: ${hash}`);
    console.log(`[${timeStr}] Method: triggerMechanismsExternal (no transfer, balance is 0)`);
    console.log(`[${timeStr}] View on BscScan: https://bscscan.com/tx/${hash}`);

    // Don't wait for receipt to avoid Cloudflare subrequest limit
    return {
      success: true,
      message: `triggerMechanismsExternal sent at ${timeStr}`,
      txHash: hash,
      bscscanUrl: `https://bscscan.com/tx/${hash}`,
      details: {
        from: account.address,
        to: hafTokenAddress,
        amount: '0',
        method: 'triggerMechanismsExternal',
        chainId,
        tokenAddress: hafTokenAddress,
        timestamp: timeStr,
      }
    };
  }

  // Transfer 1 wei to self to trigger mechanisms
  // This is the simplest way to trigger the _triggerLazyMechanisms() in _update()
  const transferAmount = 1n;

  console.log(`[${timeStr}] ====== TRANSFER DETAILS ======`);
  console.log(`[${timeStr}] From: ${account.address}`);
  console.log(`[${timeStr}] To: ${account.address} (self)`);
  console.log(`[${timeStr}] Amount: ${transferAmount} wei HAF`);
  console.log(`[${timeStr}] Token: ${hafTokenAddress}`);
  console.log(`[${timeStr}] Chain: BSC (${chainId})`);
  console.log(`[${timeStr}] ==============================`);

  const hash = await walletClient.writeContract({
    address: hafTokenAddress,
    abi: HAF_TOKEN_ABI,
    functionName: 'transfer',
    args: [account.address, transferAmount],
  });

  console.log(`[${timeStr}] Transfer tx hash: ${hash}`);
  console.log(`[${timeStr}] View on BscScan: https://bscscan.com/tx/${hash}`);

  // Don't wait for receipt to avoid Cloudflare subrequest limit
  return {
    success: true,
    message: `HAFToken transfer sent at ${timeStr}`,
    txHash: hash,
    bscscanUrl: `https://bscscan.com/tx/${hash}`,
    details: {
      from: account.address,
      to: account.address,
      amount: transferAmount.toString(),
      method: 'transfer (self)',
      chainId,
      tokenAddress: hafTokenAddress,
      timestamp: timeStr,
    }
  };
}

// Export worker
export default {
  // Scheduled cron trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron trigger fired at: ${new Date(event.scheduledTime).toISOString()}`);
    
    try {
      const result = await triggerHAFToken(env);
      console.log('Trigger result:', result);
    } catch (error) {
      console.error('Trigger failed:', error);
      throw error;
    }
  },

  // HTTP handler for manual testing
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: getUTC8TimeString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger (for testing)
    if (url.pathname === '/trigger') {
      try {
        const result = await triggerHAFToken(env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({ success: false, message: errorMessage }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Info endpoint
    if (url.pathname === '/info') {
      const info = {
        name: 'HAFToken Trigger Worker',
        description: 'Scheduled trigger for HAFToken mechanisms',
        schedule: {
          '08:00 UTC+8': 'Morning trigger (daily burn check)',
          '16:00 UTC+8': 'Afternoon trigger',
          '23:59 UTC+8': 'Pre-midnight trigger',
          '00:00 UTC+8': 'Midnight trigger',
          '00:01 UTC+8': 'Post-midnight trigger',
        },
        currentTime: getUTC8TimeString(),
        endpoints: {
          '/health': 'Health check',
          '/trigger': 'Manual trigger (execute immediately)',
          '/info': 'This info page',
        },
      };
      return new Response(JSON.stringify(info, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('HAFToken Trigger Worker - Visit /info for details', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
