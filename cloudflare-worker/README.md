# HashFi Cloudflare Workers API

这是 HashFi 平台的无服务器 API,用于管理轮播图和公告。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd cloudflare-worker
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 KV 命名空间

```bash
# 生产环境
npx wrangler kv:namespace create HASHFI_DATA

# 会得到类似的输出:
# [[kv_namespaces]]
# binding = "HASHFI_DATA"
# id = "xxxxx"

# 把 id 复制到 wrangler.toml 的 kv_namespaces 配置中
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

## 📡 API 端点

### 轮播图管理

- `GET /banners` - 获取所有轮播图
- `POST /banners` - 创建轮播图 (需要签名)
- `PUT /banners/:id` - 更新轮播图 (需要签名)
- `DELETE /banners/:id` - 删除轮播图 (需要签名)

### 公告管理

- `GET /announcements` - 获取所有公告
- `POST /announcements` - 创建公告 (需要签名)
- `PUT /announcements/:id` - 更新公告 (需要签名)
- `DELETE /announcements/:id` - 删除公告 (需要签名)

## 🔐 认证

所有写操作都需要在 HTTP 头中包含签名:

```
Authorization: Bearer <wallet_signature>
```

**注意**: 这是一个简单的签名验证实现,只检查签名长度 > 10。在生产环境中应该实现真正的签名验证!

## 🎯 使用示例

### 前端配置

在项目根目录创建 `.env` 文件:

```env
VITE_API_URL=https://your-worker.workers.dev
```

### 创建轮播图

```javascript
const signature = localStorage.getItem('admin_signature');

await fetch('https://your-worker.workers.dev/banners', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${signature}`
  },
  body: JSON.stringify({
    title: '欢迎加入 HashFi',
    description: '开启你的 DeFi 之旅',
    imageUrl: 'https://example.com/banner.jpg',
    link: 'https://hashfi.io',
    order: 0,
    active: true
  })
});
```

## 💰 成本

Cloudflare Workers 免费套餐:
- 每天 100,000 次请求
- 每天 10 ms CPU 时间
- KV 免费 1GB 存储
- KV 每天 100,000 次读取
- KV 每天 1,000 次写入

**对于这个项目来说完全够用!** 🎉

## 🛠️ 开发说明

### 数据结构

#### Banner
```typescript
{
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  order: number;
  active: boolean;
  createdAt: string;
}
```

#### Announcement
```typescript
{
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'important' | 'urgent';
  link?: string;
  active: boolean;
  createdAt: string;
}
```

## 📝 部署后操作

1. 复制 Worker URL
2. 更新前端项目的 `.env` 文件
3. 在管理员面板进行签名认证
4. 开始管理轮播图和公告

## 🤝 贡献

如果需要真正的签名验证,修改 `src/index.ts` 中的 `isAuthorized` 函数。
