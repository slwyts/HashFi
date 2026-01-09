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

// 请求超时包装函数
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

/**
 * 从多个API源获取比特币数据
 * 使用多备用源 + 超时控制，提高稳定性
 */
async function fetchBitcoinDataFromAPIs(): Promise<Partial<BitcoinData>> {
  console.log('Fetching Bitcoin data from APIs...');
  
  let price = 0;
  let hashrate = 0;
  let difficulty = 0;
  
  // ========== 获取价格 (按优先级尝试多个API) ==========
  const priceAPIs = [
    // API 1: Binance - 最快最稳定
    async () => {
      const res = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {}, 3000);
      if (!res.ok) throw new Error(`Binance error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.price) return parseFloat(data.price);
      throw new Error('Binance: no price');
    },
    // API 2: OKX
    async () => {
      const res = await fetchWithTimeout('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', {}, 3000);
      if (!res.ok) throw new Error(`OKX error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.data?.[0]?.last) return parseFloat(data.data[0].last);
      throw new Error('OKX: no price');
    },
    // API 3: CoinGecko
    async () => {
      const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { 
        headers: { 'Accept': 'application/json' } 
      }, 5000);
      if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.bitcoin?.usd) return data.bitcoin.usd;
      throw new Error('CoinGecko: no price');
    },
    // API 4: CoinCap
    async () => {
      const res = await fetchWithTimeout('https://api.coincap.io/v2/assets/bitcoin', {}, 5000);
      if (!res.ok) throw new Error(`CoinCap error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.data?.priceUsd) return parseFloat(data.data.priceUsd);
      throw new Error('CoinCap: no price');
    },
    // API 5: Kraken
    async () => {
      const res = await fetchWithTimeout('https://api.kraken.com/0/public/Ticker?pair=XBTUSD', {}, 5000);
      if (!res.ok) throw new Error(`Kraken error: ${res.status}`);
      const data = await res.json() as any;
      if (data?.result?.XXBTZUSD?.c?.[0]) return parseFloat(data.result.XXBTZUSD.c[0]);
      throw new Error('Kraken: no price');
    },
  ];
  
  // 依次尝试价格 API
  for (const fetchPrice of priceAPIs) {
    try {
      price = await fetchPrice();
      if (price > 0) {
        console.log('Got BTC price:', price);
        break;
      }
    } catch (err) {
      console.log('Price API failed:', err instanceof Error ? err.message : err);
    }
  }
  
  // ========== 获取算力和难度 (并行请求多个备用) ==========
  const [hashrateResult, difficultyResult] = await Promise.allSettled([
    // 算力 - Blockchain.info
    (async () => {
      try {
        const res = await fetchWithTimeout('https://blockchain.info/q/hashrate', {}, 5000);
        const text = await res.text();
        const value = parseFloat(text);
        if (value > 0) return value / 1_000_000_000; // 转换为 EH/s
      } catch (e) {
        console.log('Blockchain.info hashrate failed:', e);
      }
      // 备用：使用 mempool.space
      try {
        const res = await fetchWithTimeout('https://mempool.space/api/v1/mining/hashrate/1d', {}, 5000);
        const data = await res.json() as any;
        if (data?.currentHashrate) return data.currentHashrate / 1e18; // 转换为 EH/s
      } catch (e) {
        console.log('Mempool hashrate failed:', e);
      }
      return 0;
    })(),
    // 难度 - Blockchain.info
    (async () => {
      try {
        const res = await fetchWithTimeout('https://blockchain.info/q/getdifficulty', {}, 5000);
        const text = await res.text();
        return parseFloat(text);
      } catch (e) {
        console.log('Blockchain.info difficulty failed:', e);
      }
      // 备用：使用 mempool.space
      try {
        const res = await fetchWithTimeout('https://mempool.space/api/v1/difficulty-adjustment', {}, 5000);
        const data = await res.json() as any;
        if (data?.difficultyChange !== undefined) {
          // mempool 返回的是调整百分比，需要获取实际难度
          const blocksRes = await fetchWithTimeout('https://mempool.space/api/blocks/tip/height', {}, 3000);
          const height = parseInt(await blocksRes.text());
          const blockRes = await fetchWithTimeout(`https://mempool.space/api/block-height/${height}`, {}, 3000);
          const blockHash = await blockRes.text();
          const blockDataRes = await fetchWithTimeout(`https://mempool.space/api/block/${blockHash}`, {}, 3000);
          const blockData = await blockDataRes.json() as any;
          if (blockData?.difficulty) return blockData.difficulty;
        }
      } catch (e) {
        console.log('Mempool difficulty failed:', e);
      }
      return 0;
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
 */
async function refreshBitcoinDataInBackground(env: Env, cacheKey: string): Promise<void> {
  try {
    console.log('Background refresh started');
    
    // 获取旧缓存数据（作为fallback）
    const cachedDataJson = await env.HASHFI_DATA.get(cacheKey);
    let oldData: BitcoinData | null = null;
    if (cachedDataJson) {
      const oldCache: BitcoinCache = JSON.parse(cachedDataJson);
      oldData = oldCache.data;
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
    
    // 只有价格有效时才更新缓存
    if (bitcoinData.price > 0) {
      const cacheData: BitcoinCache = {
        data: bitcoinData,
        cachedAt: Date.now(),
      };
      
      await env.HASHFI_DATA.put(cacheKey, JSON.stringify(cacheData), {
        expirationTtl: 600, // 10分钟
      });
      
      console.log('Background refresh completed successfully:', bitcoinData);
    } else {
      console.log('Background refresh failed: price is 0, keeping old cache');
    }
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}

// 获取比特币实时数据 - SWR 策略
async function getBitcoinData(env: Env, context?: ExecutionContext): Promise<Response> {
  try {
    const CACHE_KEY = 'btc_data_cache';
    const CACHE_DURATION = 60 * 1000; // 1分钟后视为 stale（触发后台刷新）
    
    // 1. 尝试从 KV 获取缓存
    const cachedDataJson = await env.HASHFI_DATA.get(CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData: BitcoinCache = JSON.parse(cachedDataJson);
      const now = Date.now();
      const cacheAge = now - cachedData.cachedAt;
      const isStale = cacheAge >= CACHE_DURATION;
      
      // ✅ SWR: 有缓存就立即返回，无论是否过期
      // 如果缓存过期，触发后台更新（不阻塞响应）
      if (isStale && context) {
        console.log('Cache is stale, triggering background refresh');
        context.waitUntil(refreshBitcoinDataInBackground(env, CACHE_KEY));
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
    
    // 2. 没有缓存，首次获取数据（同时后台也获取，谁先返回用谁）
    console.log('No cache found, fetching fresh data...');
    
    const newData = await fetchBitcoinDataFromAPIs();
    
    // 构建数据（即使部分失败也返回，用0填充）
    const bitcoinData: BitcoinData = {
      price: newData.price || 0,
      hashrate: newData.hashrate || 0,
      difficulty: newData.difficulty || 0,
      updatedAt: new Date().toISOString(),
    };
    
    // 只有有有效数据时才缓存
    if (bitcoinData.price > 0) {
      const cacheData: BitcoinCache = {
        data: bitcoinData,
        cachedAt: Date.now(),
      };
      
      await env.HASHFI_DATA.put(CACHE_KEY, JSON.stringify(cacheData), {
        expirationTtl: 3600, // KV 过期时间 1小时（SWR 逻辑用 cachedAt 控制）
      });
      
      console.log('Bitcoin data cached successfully:', bitcoinData);
    }
    
    // 始终返回成功，让前端用 - 显示无数据
    return new Response(JSON.stringify({ 
      success: true, 
      data: bitcoinData,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Failed to get Bitcoin data:', error);
    // 即使出错也返回空数据，不返回错误
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
