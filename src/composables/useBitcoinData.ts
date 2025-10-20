import { ref, onMounted } from 'vue';

interface BitcoinData {
  price: number;
  hashrate: number;
  difficulty: number;
  updatedAt: string;
}

const WORKER_API = import.meta.env.VITE_API_URL || 'https://hashfi-api.a3144390867.workers.dev';

// 全局缓存
let cachedData: BitcoinData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟

export function useBitcoinData() {
  const btcData = ref<BitcoinData | null>(null);
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
      const response = await fetch(`${WORKER_API}/btc-data`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin data');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        cachedData = result.data;
        lastFetchTime = now;
        btcData.value = result.data;
        console.log('Bitcoin data fetched:', result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching Bitcoin data:', err);
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
