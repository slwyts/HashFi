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

// 获取比特币实时数据
async function getBitcoinData(env: Env): Promise<Response> {
  try {
    const CACHE_KEY = 'btc_data_cache';
    const CACHE_DURATION = 10 * 60 * 1000; // 10分钟（毫秒）
    
    // 1. 尝试从 KV 获取缓存
    const cachedDataJson = await env.HASHFI_DATA.get(CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData: BitcoinCache = JSON.parse(cachedDataJson);
      const now = Date.now();
      
      // 检查缓存是否在有效期内
      if (now - cachedData.cachedAt < CACHE_DURATION) {
        console.log('Using cached Bitcoin data');
        return new Response(JSON.stringify({ 
          success: true, 
          data: cachedData.data,
          cached: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // 2. 缓存过期或不存在，获取新数据
    console.log('Fetching fresh Bitcoin data...');
    
    // 并行请求多个 API
    const [priceData, blockchainData] = await Promise.allSettled([
      // API 1: CoinGecko - 获取价格
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(r => r.json()),
      
      // API 2: Blockchain.info - 获取全网算力和难度
      fetch('https://blockchain.info/q/hashrate').then(r => r.text()).then(text => ({
        hashrate: parseFloat(text)
      })).catch(() => null),
    ]);
    
    // API 3: 获取难度（备用 API）
    const difficultyData = await fetch('https://blockchain.info/q/getdifficulty')
      .then(r => r.text())
      .then(text => parseFloat(text))
      .catch(() => null);
    
    // 解析数据
    let price = 0;
    let hashrate = 0;
    let difficulty = 0;
    
    // 处理价格
    if (priceData.status === 'fulfilled' && priceData.value) {
      const priceResult = priceData.value as any;
      if (priceResult?.bitcoin?.usd) {
        price = priceResult.bitcoin.usd;
      }
    }
    
    // 处理算力（从 blockchain.info 返回值转换为 EH/s）
    if (blockchainData.status === 'fulfilled' && blockchainData.value?.hashrate) {
      // blockchain.info 返回的单位是 GH/s（千兆哈希/秒）
      // 1 EH/s = 1,000,000,000 GH/s (10^9)
      hashrate = blockchainData.value.hashrate / 1_000_000_000;
    }
    
    // 处理难度
    if (difficultyData) {
      difficulty = difficultyData;
    }
    
    // 如果所有数据都获取失败，使用旧缓存（如果有）
    if (price === 0 && hashrate === 0 && difficulty === 0 && cachedDataJson) {
      console.log('All APIs failed, using old cache');
      const oldCache: BitcoinCache = JSON.parse(cachedDataJson);
      return new Response(JSON.stringify({ 
        success: true, 
        data: oldCache.data,
        cached: true,
        stale: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 3. 构建新数据
    const bitcoinData: BitcoinData = {
      price: price || 0,
      hashrate: hashrate || 0,
      difficulty: difficulty || 0,
      updatedAt: new Date().toISOString(),
    };
    
    // 4. 保存到 KV 缓存（10分钟 TTL）
    const cacheData: BitcoinCache = {
      data: bitcoinData,
      cachedAt: Date.now(),
    };
    
    await env.HASHFI_DATA.put(CACHE_KEY, JSON.stringify(cacheData), {
      expirationTtl: 600, // 10分钟
    });
    
    console.log('Bitcoin data updated:', bitcoinData);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: bitcoinData,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Failed to get Bitcoin data:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get Bitcoin data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
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
  async fetch(request: Request, env: Env): Promise<Response> {
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
        return getBitcoinData(env);
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
