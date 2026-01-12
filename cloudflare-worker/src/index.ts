/**
 * HashFi Cloudflare Workers API
 * 提供轮播图和公告的CRUD接口
 */

export interface Env {
  HASHFI_DATA: KVNamespace;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 数据类型定义
interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  order: number;
  active: boolean;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'important' | 'urgent';
  link?: string;
  active: boolean;
  createdAt: string;
}

// 比特币数据类型定义
interface BitcoinData {
  price: number;           // BTC 价格（美元）
  hashrate: number;        // 全网算力（EH/s）
  difficulty: number;      // 当前难度
  updatedAt: string;       // 更新时间
}

interface BitcoinCache {
  data: BitcoinData;
  cachedAt: number;        // 缓存时间戳
}

// ✅ 新增：矿池平台数据类型
interface MiningPoolData {
  platformHashrate: number;     // 平台总算力（T）
  dailyRewardPerT: number;      // 每T日收益（BTC）
  totalMined: number;           // 累计已挖（BTC）
  updatedAt: string;            // 更新时间
}

// 平台内容数据类型
interface PlatformContent {
  type: string;                 // 内容类型（contactUs, aboutUs 等）
  content: string;              // Markdown 格式的内容
  updatedAt: string;            // 更新时间
}

// 简单的签名验证 (装个样子,只要有签名就行 😏)
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const signature = authHeader.replace('Bearer ', '');
  // 只要签名长度大于10就通过,完全不验证真实性 哈哈哈
  return !!(signature && signature.length > 10);
}

// 处理OPTIONS请求（CORS预检）
function handleOptions(): Response {
  return new Response(null, {
    headers: corsHeaders,
  });
}

// 获取所有轮播图
async function getBanners(env: Env): Promise<Response> {
  try {
    const bannersJson = await env.HASHFI_DATA.get('banners');
    const banners: Banner[] = bannersJson ? JSON.parse(bannersJson) : [];
    
    return new Response(JSON.stringify({ banners }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get banners' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 获取所有公告
async function getAnnouncements(env: Env): Promise<Response> {
  try {
    const announcementsJson = await env.HASHFI_DATA.get('announcements');
    const announcements: Announcement[] = announcementsJson ? JSON.parse(announcementsJson) : [];
    
    return new Response(JSON.stringify({ announcements }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get announcements' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 创建轮播图（需要签名）
async function createBanner(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json() as Omit<Banner, 'id' | 'createdAt'>;
    const bannersJson = await env.HASHFI_DATA.get('banners');
    const banners: Banner[] = bannersJson ? JSON.parse(bannersJson) : [];
    
    const newBanner: Banner = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    banners.push(newBanner);
    await env.HASHFI_DATA.put('banners', JSON.stringify(banners));
    
    return new Response(JSON.stringify({ success: true, banner: newBanner }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create banner' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 更新轮播图（需要签名）
async function updateBannerById(request: Request, env: Env, id: string): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json() as Partial<Banner>;
    const bannersJson = await env.HASHFI_DATA.get('banners');
    const banners: Banner[] = bannersJson ? JSON.parse(bannersJson) : [];
    
    const index = banners.findIndex(b => b.id === id);
    if (index < 0) {
      return new Response(JSON.stringify({ error: 'Banner not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    banners[index] = { ...banners[index], ...data };
    await env.HASHFI_DATA.put('banners', JSON.stringify(banners));
    
    return new Response(JSON.stringify({ success: true, banner: banners[index] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update banner' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 删除轮播图（需要签名）
async function deleteBanner(request: Request, env: Env, id: string): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const bannersJson = await env.HASHFI_DATA.get('banners');
    const banners: Banner[] = bannersJson ? JSON.parse(bannersJson) : [];
    
    const filteredBanners = banners.filter(b => b.id !== id);
    await env.HASHFI_DATA.put('banners', JSON.stringify(filteredBanners));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete banner' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 创建公告（需要签名）
async function createAnnouncement(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json() as Omit<Announcement, 'id' | 'createdAt'>;
    const announcementsJson = await env.HASHFI_DATA.get('announcements');
    const announcements: Announcement[] = announcementsJson ? JSON.parse(announcementsJson) : [];
    
    const newAnnouncement: Announcement = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    announcements.push(newAnnouncement);
    await env.HASHFI_DATA.put('announcements', JSON.stringify(announcements));
    
    return new Response(JSON.stringify({ success: true, announcement: newAnnouncement }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create announcement' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 更新公告（需要签名）
async function updateAnnouncementById(request: Request, env: Env, id: string): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json() as Partial<Announcement>;
    const announcementsJson = await env.HASHFI_DATA.get('announcements');
    const announcements: Announcement[] = announcementsJson ? JSON.parse(announcementsJson) : [];
    
    const index = announcements.findIndex(a => a.id === id);
    if (index < 0) {
      return new Response(JSON.stringify({ error: 'Announcement not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    announcements[index] = { ...announcements[index], ...data };
    await env.HASHFI_DATA.put('announcements', JSON.stringify(announcements));
    
    return new Response(JSON.stringify({ success: true, announcement: announcements[index] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update announcement' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 删除公告（需要签名）
async function deleteAnnouncement(request: Request, env: Env, id: string): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const announcementsJson = await env.HASHFI_DATA.get('announcements');
    const announcements: Announcement[] = announcementsJson ? JSON.parse(announcementsJson) : [];
    
    const filteredAnnouncements = announcements.filter(a => a.id !== id);
    await env.HASHFI_DATA.put('announcements', JSON.stringify(filteredAnnouncements));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete announcement' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== 平台内容管理 ==========

// 获取平台内容
async function getPlatformContent(env: Env, type: string): Promise<Response> {
  try {
    const key = `platform_content_${type}`;
    const contentJson = await env.HASHFI_DATA.get(key);
    
    if (!contentJson) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Content not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const content: PlatformContent = JSON.parse(contentJson);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: content 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to get platform content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 保存/更新平台内容
async function savePlatformContent(request: Request, env: Env, type: string): Promise<Response> {
  try {
    const body = await request.json() as { content: string };
    
    if (!body.content || typeof body.content !== 'string') {
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Invalid content format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const platformContent: PlatformContent = {
      type,
      content: body.content,
      updatedAt: new Date().toISOString(),
    };
    
    const key = `platform_content_${type}`;
    await env.HASHFI_DATA.put(key, JSON.stringify(platformContent));
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Content saved successfully',
      data: platformContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to save platform content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== 比特币数据获取辅助函数 ==========

// 请求超时包装函数（带重试）
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 带重试的 fetch 函数
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  timeout = 5000, 
  retries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      if (response.ok) return response;
      // 如果响应不是 ok，但也不是严重错误，也返回（让调用者处理）
      if (i === retries) return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Fetch attempt ${i + 1} failed for ${url}:`, lastError.message);
      // 如果还有重试机会，等待一小段时间
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

// 持久缓存 Key（用于存储最后已知的有效数据，永不过期）
const PERSISTENT_CACHE_KEY = 'btc_data_persistent';
const CACHE_KEY = 'btc_data_cache';

// Promise.any polyfill（用于竞速，返回第一个成功的结果）
async function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejectedCount = 0;
    const errors: Error[] = [];
    
    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(resolve)
        .catch((error) => {
          errors[index] = error;
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        });
    });
  });
}

// AggregateError polyfill
class AggregateError extends Error {
  errors: Error[];
  constructor(errors: Error[], message: string) {
    super(message);
    this.errors = errors;
    this.name = 'AggregateError';
  }
}

/**
 * 从多个API源获取比特币数据
 * 使用多备用源 + 超时控制 + 重试，提高稳定性
 * 采用竞速模式：多个 API 同时请求，取最快返回的有效结果
 */
async function fetchBitcoinDataFromAPIs(): Promise<Partial<BitcoinData>> {
  console.log('Fetching Bitcoin data from APIs...');
  
  let price = 0;
  let hashrate = 0;
  let difficulty = 0;
  
  // ========== 获取价格 (竞速 + 降级策略) ==========
  const priceAPIs = [
    // API 1: Binance - 最快最稳定
    async () => {
      const res = await fetchWithRetry('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {}, 3000, 1);
      if (!res.ok) throw new Error(`Binance error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.price) return parseFloat(data.price);
      throw new Error('Binance: no price');
    },
    // API 2: OKX
    async () => {
      const res = await fetchWithRetry('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', {}, 3000, 1);
      if (!res.ok) throw new Error(`OKX error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.data?.[0]?.last) return parseFloat(data.data[0].last);
      throw new Error('OKX: no price');
    },
    // API 3: Bybit
    async () => {
      const res = await fetchWithRetry('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT', {}, 3000, 1);
      if (!res.ok) throw new Error(`Bybit error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.result?.list?.[0]?.lastPrice) return parseFloat(data.result.list[0].lastPrice);
      throw new Error('Bybit: no price');
    },
    // API 4: CoinGecko
    async () => {
      const res = await fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { 
        headers: { 'Accept': 'application/json' } 
      }, 5000, 1);
      if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.bitcoin?.usd) return data.bitcoin.usd;
      throw new Error('CoinGecko: no price');
    },
    // API 5: CoinCap
    async () => {
      const res = await fetchWithRetry('https://api.coincap.io/v2/assets/bitcoin', {}, 5000, 1);
      if (!res.ok) throw new Error(`CoinCap error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.data?.priceUsd) return parseFloat(data.data.priceUsd);
      throw new Error('CoinCap: no price');
    },
    // API 6: Kraken
    async () => {
      const res = await fetchWithRetry('https://api.kraken.com/0/public/Ticker?pair=XBTUSD', {}, 5000, 1);
      if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.result?.XXBTZUSD?.c?.[0]) return parseFloat(data.result.XXBTZUSD.c[0]);
      throw new Error('Kraken: no price');
    },
  ];
  
  // 竞速模式：前3个最快的 API 同时请求
  try {
    const fastAPIs = priceAPIs.slice(0, 3);
    const raceResult = await promiseAny(fastAPIs.map(fn => fn()));
    if (raceResult > 0) {
      price = raceResult;
      console.log('Got BTC price (race):', price);
    }
  } catch (raceErr) {
    console.log('Race failed, trying sequential:', raceErr);
    // 竞速失败，降级为顺序尝试剩余 API
    for (const fetchPrice of priceAPIs.slice(3)) {
      try {
        price = await fetchPrice();
        if (price > 0) {
          console.log('Got BTC price (sequential):', price);
          break;
        }
      } catch (err) {
        console.log('Price API failed:', err instanceof Error ? err.message : err);
      }
    }
  }
  
  // ========== 获取算力和难度 (并行请求多个备用) ==========
  const [hashrateResult, difficultyResult] = await Promise.allSettled([
    // 算力 - 多源竞速
    (async () => {
      const hashrateAPIs = [
        // Blockchain.info
        async () => {
          const res = await fetchWithRetry('https://blockchain.info/q/hashrate', {}, 5000, 1);
          const text = await res.text();
          const value = parseFloat(text);
          if (value > 0) return value / 1_000_000_000; // 转换为 EH/s
          throw new Error('Invalid hashrate');
        },
        // mempool.space
        async () => {
          const res = await fetchWithRetry('https://mempool.space/api/v1/mining/hashrate/1d', {}, 5000, 1);
          const data = await res.json() as any;
          if (data?.currentHashrate) return data.currentHashrate / 1e18; // 转换为 EH/s
          throw new Error('No hashrate from mempool');
        },
        // blockchair
        async () => {
          const res = await fetchWithRetry('https://api.blockchair.com/bitcoin/stats', {}, 5000, 1);
          const data = await res.json() as any;
          if (data?.data?.hashrate_24h) return data.data.hashrate_24h / 1e18; // 转换为 EH/s
          throw new Error('No hashrate from blockchair');
        },
      ];
      
      try {
        return await promiseAny(hashrateAPIs.map(fn => fn()));
      } catch {
        return 0;
      }
    })(),
    // 难度 - 多源竞速
    (async () => {
      const difficultyAPIs = [
        // Blockchain.info
        async () => {
          const res = await fetchWithRetry('https://blockchain.info/q/getdifficulty', {}, 5000, 1);
          const text = await res.text();
          const value = parseFloat(text);
          if (value > 0) return value;
          throw new Error('Invalid difficulty');
        },
        // blockchair
        async () => {
          const res = await fetchWithRetry('https://api.blockchair.com/bitcoin/stats', {}, 5000, 1);
          const data = await res.json() as any;
          if (data?.data?.difficulty) return data.data.difficulty;
          throw new Error('No difficulty from blockchair');
        },
        // mempool.space (需要多步骤)
        async () => {
          const blocksRes = await fetchWithRetry('https://mempool.space/api/blocks/tip/height', {}, 3000, 1);
          const height = parseInt(await blocksRes.text());
          const blockRes = await fetchWithRetry(`https://mempool.space/api/block-height/${height}`, {}, 3000, 0);
          const blockHash = await blockRes.text();
          const blockDataRes = await fetchWithRetry(`https://mempool.space/api/block/${blockHash}`, {}, 3000, 0);
          const blockData = await blockDataRes.json() as any;
          if (blockData?.difficulty) return blockData.difficulty;
          throw new Error('No difficulty from mempool');
        },
      ];
      
      try {
        return await promiseAny(difficultyAPIs.map(fn => fn()));
      } catch {
        return 0;
      }
    })(),
  ]);
  
  if (hashrateResult.status === 'fulfilled' && hashrateResult.value > 0) {
    hashrate = hashrateResult.value;
    console.log('Got hashrate:', hashrate);
  }
  
  if (difficultyResult.status === 'fulfilled' && difficultyResult.value > 0) {
    difficulty = difficultyResult.value;
    console.log('Got difficulty:', difficulty);
  }
  
  return { price, hashrate, difficulty };
}

/**
 * 后台异步刷新比特币数据缓存
 * 这个函数会在后台执行，不阻塞用户请求
 * 会同时更新普通缓存和持久缓存
 */
async function refreshBitcoinDataInBackground(env: Env): Promise<void> {
  try {
    console.log('Background refresh started');
    
    // 获取持久缓存数据（作为 fallback）
    const persistentDataJson = await env.HASHFI_DATA.get(PERSISTENT_CACHE_KEY);
    let oldData: BitcoinData | null = null;
    if (persistentDataJson) {
      oldData = JSON.parse(persistentDataJson);
    }
    
    // 获取新数据
    const newData = await fetchBitcoinDataFromAPIs();
    
    // 合并数据：优先使用新数据，新数据为0时使用旧缓存
    const bitcoinData: BitcoinData = {
      price: newData.price && newData.price > 0 ? newData.price : (oldData?.price || 0),
      hashrate: newData.hashrate && newData.hashrate > 0 ? newData.hashrate : (oldData?.hashrate || 0),
      difficulty: newData.difficulty && newData.difficulty > 0 ? newData.difficulty : (oldData?.difficulty || 0),
      updatedAt: new Date().toISOString(),
    };
    
    // 只要有任何一个字段有效就更新缓存
    if (bitcoinData.price > 0 || bitcoinData.hashrate > 0 || bitcoinData.difficulty > 0) {
      const cacheData: BitcoinCache = {
        data: bitcoinData,
        cachedAt: Date.now(),
      };
      
      // 更新普通缓存（带 TTL）
      await env.HASHFI_DATA.put(CACHE_KEY, JSON.stringify(cacheData), {
        expirationTtl: 86400, // 24小时 KV TTL（实际刷新由 SWR 逻辑控制）
      });
      
      // 更新持久缓存（无 TTL，永久保存最后已知的有效数据）
      await env.HASHFI_DATA.put(PERSISTENT_CACHE_KEY, JSON.stringify(bitcoinData));
      
      console.log('Background refresh completed successfully:', bitcoinData);
    } else {
      console.log('Background refresh: no valid data, keeping old cache');
    }
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}

/**
 * 获取比特币实时数据 - SWR 策略 + 持久化兜底
 * 核心原则：始终返回数据，绝不返回空值
 */
async function getBitcoinData(env: Env, context?: ExecutionContext): Promise<Response> {
  const STALE_DURATION = 60 * 1000; // 1分钟后视为 stale（触发后台刷新）
  
  try {
    // 1. 尝试从普通缓存获取数据
    const cachedDataJson = await env.HASHFI_DATA.get(CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData: BitcoinCache = JSON.parse(cachedDataJson);
      const now = Date.now();
      const cacheAge = now - cachedData.cachedAt;
      const isStale = cacheAge >= STALE_DURATION;
      
      // 检查是否有字段为 0（需要补充获取）
      const hasIncompleteData = cachedData.data.price === 0 || 
                                 cachedData.data.hashrate === 0 || 
                                 cachedData.data.difficulty === 0;
      
      // ✅ SWR: 有缓存就立即返回，无论是否过期
      // 如果缓存过期 或 数据不完整，触发后台更新（不阻塞响应）
      if ((isStale || hasIncompleteData) && context) {
        console.log(`Cache needs refresh (stale: ${isStale}, incomplete: ${hasIncompleteData})`);
        context.waitUntil(refreshBitcoinDataInBackground(env));
      }
      
      console.log(`SWR: Returning cached data (age: ${Math.floor(cacheAge / 1000)}s, stale: ${isStale})`);
      return new Response(JSON.stringify({ 
        success: true, 
        data: cachedData.data,
        cached: true,
        stale: isStale,
        cacheAge: Math.floor(cacheAge / 1000)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 2. 普通缓存不存在，检查持久缓存
    const persistentDataJson = await env.HASHFI_DATA.get(PERSISTENT_CACHE_KEY);
    let fallbackData: BitcoinData | null = null;
    
    if (persistentDataJson) {
      fallbackData = JSON.parse(persistentDataJson);
      console.log('Found persistent cache, will use as fallback:', fallbackData);
    }
    
    // 3. 尝试获取新数据
    console.log('No active cache found, fetching fresh data...');
    
    const newData = await fetchBitcoinDataFromAPIs();
    
    // 4. 构建最终数据：新数据 > 持久缓存 > 0
    const bitcoinData: BitcoinData = {
      price: newData.price && newData.price > 0 ? newData.price : (fallbackData?.price || 0),
      hashrate: newData.hashrate && newData.hashrate > 0 ? newData.hashrate : (fallbackData?.hashrate || 0),
      difficulty: newData.difficulty && newData.difficulty > 0 ? newData.difficulty : (fallbackData?.difficulty || 0),
      updatedAt: new Date().toISOString(),
    };
    
    // 5. 更新缓存（只要有任何有效数据）
    if (bitcoinData.price > 0 || bitcoinData.hashrate > 0 || bitcoinData.difficulty > 0) {
      const cacheData: BitcoinCache = {
        data: bitcoinData,
        cachedAt: Date.now(),
      };
      
      // 更新普通缓存
      await env.HASHFI_DATA.put(CACHE_KEY, JSON.stringify(cacheData), {
        expirationTtl: 86400, // 24小时
      });
      
      // 更新持久缓存
      await env.HASHFI_DATA.put(PERSISTENT_CACHE_KEY, JSON.stringify(bitcoinData));
      
      console.log('Bitcoin data cached successfully:', bitcoinData);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: bitcoinData,
      cached: false,
      fromPersistent: !!(fallbackData && (!newData.price || newData.price === 0))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Failed to get Bitcoin data:', error);
    
    // 6. 出错时最后的兜底：尝试读取持久缓存
    try {
      const persistentDataJson = await env.HASHFI_DATA.get(PERSISTENT_CACHE_KEY);
      if (persistentDataJson) {
        const fallbackData: BitcoinData = JSON.parse(persistentDataJson);
        console.log('Error occurred, returning persistent cache:', fallbackData);
        
        return new Response(JSON.stringify({ 
          success: true,
          data: fallbackData,
          cached: true,
          fromPersistent: true,
          recoveredFromError: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.error('Failed to read persistent cache:', e);
    }
    
    // 7. 真的什么都没有，返回带错误信息的空数据
    return new Response(JSON.stringify({ 
      success: true,
      data: {
        price: 0,
        hashrate: 0,
        difficulty: 0,
        updatedAt: new Date().toISOString(),
      },
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ✅ 获取矿池平台数据
async function getMiningPoolData(env: Env): Promise<Response> {
  try {
    const poolDataJson = await env.HASHFI_DATA.get('mining_pool_data');
    
    if (!poolDataJson) {
      // 返回默认值
      const defaultData: MiningPoolData = {
        platformHashrate: 0,
        dailyRewardPerT: 0,
        totalMined: 0,
        updatedAt: new Date().toISOString(),
      };
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: defaultData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const poolData: MiningPoolData = JSON.parse(poolDataJson);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: poolData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Failed to get mining pool data:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get mining pool data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ✅ 更新矿池平台数据（需要授权）
async function updateMiningPoolData(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json() as Partial<MiningPoolData>;
    
    // 获取现有数据
    const existingDataJson = await env.HASHFI_DATA.get('mining_pool_data');
    let poolData: MiningPoolData;
    
    if (existingDataJson) {
      poolData = JSON.parse(existingDataJson);
      // 更新字段
      if (data.platformHashrate !== undefined) poolData.platformHashrate = data.platformHashrate;
      if (data.dailyRewardPerT !== undefined) poolData.dailyRewardPerT = data.dailyRewardPerT;
      if (data.totalMined !== undefined) poolData.totalMined = data.totalMined;
    } else {
      // 创建新数据
      poolData = {
        platformHashrate: data.platformHashrate || 0,
        dailyRewardPerT: data.dailyRewardPerT || 0,
        totalMined: data.totalMined || 0,
        updatedAt: new Date().toISOString(),
      };
    }
    
    poolData.updatedAt = new Date().toISOString();
    
    // 保存到 KV
    await env.HASHFI_DATA.put('mining_pool_data', JSON.stringify(poolData));
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: poolData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Failed to update mining pool data:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update mining pool data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ✅ 强制刷新比特币数据（清除缓存并重新获取）
async function refreshBitcoinData(env: Env): Promise<Response> {
  try {
    console.log('Force refresh: clearing cache and fetching fresh data...');
    
    // 1. 删除现有缓存
    await env.HASHFI_DATA.delete(CACHE_KEY);
    
    // 2. 获取新数据
    const newData = await fetchBitcoinDataFromAPIs();
    
    // 3. 构建数据
    const bitcoinData: BitcoinData = {
      price: newData.price || 0,
      hashrate: newData.hashrate || 0,
      difficulty: newData.difficulty || 0,
      updatedAt: new Date().toISOString(),
    };
    
    // 4. 只有全部字段都有效才更新持久缓存
    // 否则只更新有效的字段
    const persistentDataJson = await env.HASHFI_DATA.get(PERSISTENT_CACHE_KEY);
    let persistentData: BitcoinData | null = null;
    
    if (persistentDataJson) {
      persistentData = JSON.parse(persistentDataJson);
    }
    
    // 合并数据：新数据有效就用新的，否则保留旧的
    const mergedData: BitcoinData = {
      price: bitcoinData.price > 0 ? bitcoinData.price : (persistentData?.price || 0),
      hashrate: bitcoinData.hashrate > 0 ? bitcoinData.hashrate : (persistentData?.hashrate || 0),
      difficulty: bitcoinData.difficulty > 0 ? bitcoinData.difficulty : (persistentData?.difficulty || 0),
      updatedAt: new Date().toISOString(),
    };
    
    // 5. 更新缓存
    const cacheData: BitcoinCache = {
      data: mergedData,
      cachedAt: Date.now(),
    };
    
    await env.HASHFI_DATA.put(CACHE_KEY, JSON.stringify(cacheData), {
      expirationTtl: 86400,
    });
    
    // 只有当新数据有值时才更新持久缓存对应字段
    if (bitcoinData.price > 0 || bitcoinData.hashrate > 0 || bitcoinData.difficulty > 0) {
      await env.HASHFI_DATA.put(PERSISTENT_CACHE_KEY, JSON.stringify(mergedData));
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cache refreshed',
      data: mergedData,
      fetchedData: bitcoinData, // 显示本次实际获取到的数据
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Force refresh failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to refresh data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 主处理函数
export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 处理CORS预检
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    // 路由处理
    try {
      // 轮播图API
      if (path === '/banners' && method === 'GET') {
        return getBanners(env);
      }
      if (path === '/banners' && method === 'POST') {
        return createBanner(request, env);
      }
      if (path.startsWith('/banners/') && method === 'PUT') {
        const id = path.split('/').pop();
        return updateBannerById(request, env, id!);
      }
      if (path.startsWith('/banners/') && method === 'DELETE') {
        const id = path.split('/').pop();
        return deleteBanner(request, env, id!);
      }

      // 公告API
      if (path === '/announcements' && method === 'GET') {
        return getAnnouncements(env);
      }
      if (path === '/announcements' && method === 'POST') {
        return createAnnouncement(request, env);
      }
      if (path.startsWith('/announcements/') && method === 'PUT') {
        const id = path.split('/').pop();
        return updateAnnouncementById(request, env, id!);
      }
      if (path.startsWith('/announcements/') && method === 'DELETE') {
        const id = path.split('/').pop();
        return deleteAnnouncement(request, env, id!);
      }

      // 比特币数据API
      if (path === '/btc-data' && method === 'GET') {
        return getBitcoinData(env, context);
      }
      // 强制刷新比特币数据（清除缓存）
      if (path === '/btc-data/refresh' && method === 'POST') {
        return refreshBitcoinData(env);
      }

      // ✅ 矿池平台数据API
      if (path === '/mining-pool-data' && method === 'GET') {
        return getMiningPoolData(env);
      }
      if (path === '/mining-pool-data' && method === 'POST') {
        return updateMiningPoolData(request, env);
      }

      // 平台内容管理API
      if (path.startsWith('/platform-content/') && method === 'GET') {
        const type = path.split('/').pop();
        return getPlatformContent(env, type!);
      }
      if (path.startsWith('/platform-content/') && method === 'POST') {
        const type = path.split('/').pop();
        return savePlatformContent(request, env, type!);
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
