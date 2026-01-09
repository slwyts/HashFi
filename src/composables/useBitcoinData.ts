import { ref, onMounted, onUnmounted } from 'vue';

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

// 全局共享状态（所有组件共用）
const globalBtcData = ref<CombinedData | null>(null);
const globalIsLoading = ref(false);
const globalError = ref<string | null>(null);

// 全局缓存
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1分钟缓存（用于防抖）
const POLL_INTERVAL = 60 * 1000; // 60秒轮询间隔

// 单次请求超时
const FETCH_TIMEOUT = 8000; // 8秒

// 全局轮询定时器
let pollTimer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

// 带超时的 fetch
async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 核心数据获取函数
async function fetchBitcoinData(force = false) {
  // 防抖：如果不是强制刷新，且距离上次请求不足缓存时间，跳过
  const now = Date.now();
  if (!force && lastFetchTime && now - lastFetchTime < CACHE_DURATION) {
    console.log('Skipping fetch, using recent data');
    return;
  }

  globalIsLoading.value = true;
  globalError.value = null;

  try {
    // 并行请求实时数据和平台数据，带超时控制
    const [btcResult, poolResult] = await Promise.allSettled([
      fetchWithTimeout(`${WORKER_API}/btc-data`).then(r => r.ok ? r.json() : null),
      fetchWithTimeout(`${WORKER_API}/mining-pool-data`).then(r => r.ok ? r.json() : null),
    ]);
    
    // 解析 BTC 数据
    let btcDataParsed = null;
    if (btcResult.status === 'fulfilled' && btcResult.value?.success) {
      btcDataParsed = btcResult.value.data;
    }
    
    // 解析矿池数据
    let poolDataParsed = null;
    if (poolResult.status === 'fulfilled' && poolResult.value?.success) {
      poolDataParsed = poolResult.value.data;
    }
    
    // 构建合并数据，使用旧数据作为 fallback
    const oldData = globalBtcData.value;
    const combined: CombinedData = {
      // 实时数据 - 优先新数据，否则用缓存
      btcPrice: btcDataParsed?.price || oldData?.btcPrice || 0,
      networkHashrate: btcDataParsed?.hashrate || oldData?.networkHashrate || 0,
      difficulty: btcDataParsed?.difficulty || oldData?.difficulty || 0,
      // 平台数据
      platformHashrate: poolDataParsed?.platformHashrate ?? oldData?.platformHashrate ?? 0,
      dailyRewardPerT: poolDataParsed?.dailyRewardPerT ?? oldData?.dailyRewardPerT ?? 0,
      totalMined: poolDataParsed?.totalMined ?? oldData?.totalMined ?? 0,
      updatedAt: btcDataParsed?.updatedAt || new Date().toISOString(),
    };
    
    // 更新全局状态
    globalBtcData.value = combined;
    lastFetchTime = now;
    console.log('Bitcoin data updated:', combined);
    
  } catch (err) {
    console.error('Error fetching data:', err);
    globalError.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    globalIsLoading.value = false;
  }
}

// 启动轮询
function startPolling() {
  if (pollTimer) return; // 已经在轮询
  
  console.log('Starting BTC data polling...');
  pollTimer = setInterval(() => {
    fetchBitcoinData(true); // 强制刷新
  }, POLL_INTERVAL);
}

// 停止轮询
function stopPolling() {
  if (pollTimer) {
    console.log('Stopping BTC data polling...');
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function useBitcoinData() {
  onMounted(() => {
    subscriberCount++;
    console.log(`BTC data subscriber count: ${subscriberCount}`);
    
    // 首次获取数据
    fetchBitcoinData();
    
    // 启动轮询（如果还没启动）
    startPolling();
  });

  onUnmounted(() => {
    subscriberCount--;
    console.log(`BTC data subscriber count: ${subscriberCount}`);
    
    // 没有订阅者时停止轮询
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      stopPolling();
    }
  });

  return {
    btcData: globalBtcData,
    isLoading: globalIsLoading,
    error: globalError,
    refetch: () => fetchBitcoinData(true),
  };
}

