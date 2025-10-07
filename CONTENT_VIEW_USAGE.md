# 如何使用通用内容页面 (ContentView)

通用内容页面支持显示 Markdown、HTML、PDF 和纯文本内容。

## 使用方法

### 方法 1: 通过 Query 参数传递（适合简短内容）

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

// Markdown 内容
router.push({
  path: '/content',
  query: {
    title: '关于 RWA',
    type: 'markdown',
    content: '# 什么是 RWA\n\nRWA（Real World Assets）是指真实世界资产...'
  }
});

// HTML 内容
router.push({
  path: '/content',
  query: {
    title: '用户协议',
    type: 'html',
    content: '<h1>用户协议</h1><p>欢迎使用...</p>'
  }
});

// PDF 内容
router.push({
  path: '/content',
  query: {
    title: '白皮书',
    type: 'pdf',
    content: 'https://example.com/whitepaper.pdf'
  }
});

// 纯文本
router.push({
  path: '/content',
  query: {
    title: '帮助文档',
    type: 'text',
    content: '这是纯文本内容...'
  }
});
```

### 方法 2: 通过路由参数传递（适合大量内容）

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

const contentData = {
  title: '项目路线图',
  type: 'markdown',
  content: `
# 2024 路线图

## Q1
- 启动项目
- 完成智能合约开发

## Q2
- 上线测试网
- 社区建设
  `
};

router.push({
  name: 'content',
  params: {
    data: JSON.stringify(contentData)
  }
});
```

### 方法 3: 在模板中使用

```vue
<template>
  <button @click="showMarkdownContent">查看详情</button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const showMarkdownContent = () => {
  router.push({
    path: '/content',
    query: {
      title: '代币经济学',
      type: 'markdown',
      content: `
# 代币经济学

## 总供应量
- 总量: 1,000,000,000 HAF
- 流通量: 300,000,000 HAF

## 分配比例
| 用途 | 比例 |
|------|------|
| 生态建设 | 40% |
| 团队 | 20% |
| 社区奖励 | 25% |
| 流动性 | 15% |
      `
    }
  });
};
</script>
```

## 支持的内容类型

### 1. Markdown (`type: 'markdown'`)
- 支持标准 Markdown 语法
- 自动渲染标题、列表、链接、图片等
- 支持代码块和表格

### 2. HTML (`type: 'html'`)
- 直接渲染 HTML 内容
- 自动处理图片和链接样式

### 3. PDF (`type: 'pdf'`)
- 通过 iframe 显示 PDF 文件
- content 传入 PDF 文件的 URL

### 4. 纯文本 (`type: 'text'` 或不指定)
- 保留换行和空格
- 适合简单的文本内容

## 示例：在 Profile 页面中使用

```vue
<template>
  <li @click="showContent('aboutRwa')" class="...">
    <span>{{ t('profilePage.aboutRwa') }}</span>
  </li>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const contentMap = {
  aboutRwa: {
    title: '关于 RWA',
    type: 'markdown',
    content: `
# 什么是 RWA?

RWA（Real World Assets）代表真实世界资产代币化...
    `
  }
};

const showContent = (key: string) => {
  const data = contentMap[key];
  router.push({
    path: '/content',
    query: {
      title: data.title,
      type: data.type,
      content: data.content
    }
  });
};
</script>
```

## 页面特性

- ✅ 响应式设计，自适应移动端
- ✅ 顶部显示标题和返回按钮
- ✅ 支持多种内容格式
- ✅ 美观的 Markdown 样式
- ✅ PDF 全屏显示
- ✅ 自动滚动和优化阅读体验
