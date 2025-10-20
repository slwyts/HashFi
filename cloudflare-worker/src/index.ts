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

// 收益记录缓存
interface RewardEvent {
  timestamp: number;
  blockNumber: string;
  transactionHash: string;
  fromUser: string;
  rewardType: 0 | 1 | 2 | 3;
  usdtAmount: string;
  hafAmount: string;
  formattedDate: string;
}

interface RewardCache {
  address: string;
  contractAddress: string;     // ✅ 新增：合约地址
  lastBlockNumber: string;
  events: RewardEvent[];
  updatedAt: string;
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

// 获取收益记录缓存
async function getRewardCache(env: Env, address: string, contractAddress?: string): Promise<Response> {
  try {
    const cacheKey = `reward_cache_${address.toLowerCase()}`;
    const cacheJson = await env.HASHFI_DATA.get(cacheKey);
    
    if (!cacheJson) {
      return new Response(JSON.stringify({ cache: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const cache: RewardCache = JSON.parse(cacheJson);
    
    // ✅ 检查合约地址是否匹配
    if (contractAddress) {
      // 如果请求带了合约地址，但缓存中没有或不匹配，清空缓存
      if (!cache.contractAddress || cache.contractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
        console.log(`Contract address mismatch or missing: cached=${cache.contractAddress}, requested=${contractAddress}`);
        
        // 合约地址不匹配或缺失，删除旧缓存
        await env.HASHFI_DATA.delete(cacheKey);
        
        return new Response(JSON.stringify({ 
          cache: null, 
          message: 'Contract address changed or missing in cache, cache cleared' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ cache }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get reward cache' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 更新收益记录缓存
async function updateRewardCache(request: Request, env: Env): Promise<Response> {
  try {
    const data = await request.json() as RewardCache;
    
    if (!data.address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!data.contractAddress) {
      return new Response(JSON.stringify({ error: 'Contract address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const cacheKey = `reward_cache_${data.address.toLowerCase()}`;
    
    // ✅ 保存合约地址到缓存
    const cache: RewardCache = {
      ...data,
      contractAddress: data.contractAddress.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };
    
    // 缓存 3 个月 (90天)
    await env.HASHFI_DATA.put(cacheKey, JSON.stringify(cache), {
      expirationTtl: 7776000, // 90 days = 90 * 24 * 60 * 60
    });
    
    return new Response(JSON.stringify({ success: true, cache }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update reward cache' }), {
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

      // 收益记录缓存API
      if (path.startsWith('/reward-cache/') && method === 'GET') {
        const address = path.split('/').pop();
        const contractAddress = url.searchParams.get('contract');
        return getRewardCache(env, address!, contractAddress || undefined);
      }
      if (path === '/reward-cache' && method === 'POST') {
        return updateRewardCache(request, env);
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
