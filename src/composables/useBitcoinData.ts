import { ref, onMounted } from 'vue';

interface BitcoinData {
  price: number;
  hashrate: number;
  difficulty: number;
  updatedAt: string;
}

interface MiningPoolData {
  platformHashrate: number;
  dailyRewardPerT: number;
  totalMined: number;
  updatedAt: string;
}

interface CombinedData {
  // 实时数据
  btcPrice: number;
  networkHashrate: number;
  difficulty: number;
  // 平台数据
  platformHashrate: number;
  dailyRewardPerT: number;
  totalMined: number;
  updatedAt: string;
}

const WORKER_API = import.meta.env.VITE_API_URL || 'https://hashfi-api.a3144390867.workers.dev';

// 全局缓存
let cachedData: CombinedData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟

export function useBitcoinData() {
  const btcData = ref<CombinedData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchBitcoinData = async () => {
    // 检查缓存
    const now = Date.now();
    if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      console.log('Using cached Bitcoin data');
      btcData.value = cachedData;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // 并行请求实时数据和平台数据
      const [btcResponse, poolResponse] = await Promise.all([
        fetch(`${WORKER_API}/btc-data`),
        fetch(`${WORKER_API}/mining-pool-data`),
      ]);
      
      if (!btcResponse.ok || !poolResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const btcResult = await btcResponse.json();
      const poolResult = await poolResponse.json();
      
      if (btcResult.success && poolResult.success) {
        const combined: CombinedData = {
          // 实时数据
          btcPrice: btcResult.data.price,
          networkHashrate: btcResult.data.hashrate,
          difficulty: btcResult.data.difficulty,
          // 平台数据
          platformHashrate: poolResult.data.platformHashrate,
          dailyRewardPerT: poolResult.data.dailyRewardPerT,
          totalMined: poolResult.data.totalMined,
          updatedAt: btcResult.data.updatedAt,
        };
        
        cachedData = combined;
        lastFetchTime = now;
        btcData.value = combined;
        console.log('Bitcoin and pool data fetched:', combined);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      error.value = err instanceof Error ? err.message : 'Unknown error';
      
      // 如果有缓存数据，即使过期也使用
      if (cachedData) {
        console.log('Using stale cache due to error');
        btcData.value = cachedData;
      }
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(() => {
    fetchBitcoinData();
  });

  return {
    btcData,
    isLoading,
    error,
    refetch: fetchBitcoinData,
  };
}

