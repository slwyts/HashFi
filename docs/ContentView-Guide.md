# 通用内容页面 (ContentView) 使用指南

## 📋 概述

已成功创建通用内容页面组件 `ContentView.vue`，支持展示 Markdown、HTML、PDF 和纯文本内容。

## ✨ 功能特性

- ✅ **多格式支持**: Markdown、HTML、PDF、纯文本
- ✅ **美观的顶部导航**: 蓝色返回按钮 + 标题显示
- ✅ **响应式设计**: 自适应移动端和桌面端
- ✅ **优雅的排版**: 专业的 Markdown 和 HTML 样式
- ✅ **简单易用**: 通过路由参数传递内容

## 🚀 快速开始

### 1. 基本使用（通过 Query 参数）

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

// 显示 Markdown 内容
router.push({
  path: '/content',
  query: {
    title: '文档标题',
    type: 'markdown',
    content: '# 标题\n\n这是内容...'
  }
});
```

### 2. 在 Profile 页面的实际应用

已经更新 `Profile.vue` 页面，点击"关于 RWA"、"代币经济学"、"项目路线图"会跳转到通用内容页面展示详细信息。

```typescript
// Profile.vue 中的实现
const showInfo = (type: 'aboutRwa' | 'tokenomics' | 'roadmap') => {
  const contentMap = {
    aboutRwa: {
      title: t('profilePage.aboutRwa'),
      type: 'markdown',
      content: `# 关于 RWA\n\n内容...`
    },
    // ...其他内容
  };

  const data = contentMap[type];
  router.push({
    path: '/content',
    query: data
  });
};
```

### 3. 支持的内容类型

#### Markdown (`type: 'markdown'`)
```typescript
router.push({
  path: '/content',
  query: {
    title: 'Markdown 文档',
    type: 'markdown',
    content: `
# 一级标题
## 二级标题

- 列表项 1
- 列表项 2

**粗体文本** 和 *斜体文本*

\`\`\`javascript
console.log("代码块");
\`\`\`
    `
  }
});
```

#### HTML (`type: 'html'`)
```typescript
router.push({
  path: '/content',
  query: {
    title: 'HTML 内容',
    type: 'html',
    content: '<h1>标题</h1><p>段落内容</p>'
  }
});
```

#### PDF (`type: 'pdf'`)
```typescript
router.push({
  path: '/content',
  query: {
    title: 'PDF 文档',
    type: 'pdf',
    content: 'https://example.com/document.pdf'
  }
});
```

#### 纯文本 (`type: 'text'` 或不指定)
```typescript
router.push({
  path: '/content',
  query: {
    title: '文本内容',
    type: 'text',
    content: '这是纯文本内容\n支持换行'
  }
});
```

## 🧪 测试页面

访问 `/content-test` 查看所有格式的示例：
- Markdown 示例
- HTML 示例
- 纯文本示例
- PDF 示例

## 📁 文件结构

```
src/
├── views/
│   ├── ContentView.vue      # 通用内容页面组件
│   ├── ContentTest.vue      # 测试页面（可选）
│   └── Profile.vue          # 已更新使用示例
├── router.ts                # 已添加路由配置
└── ...
```

## 🎨 样式特点

### Markdown 样式
- 美观的标题层级
- 语法高亮的代码块
- 表格和引用块样式
- 链接悬停效果

### 通用样式
- 最大宽度 4xl，居中显示
- 渐变背景色
- 响应式内边距
- 移动端优化

## 📝 注意事项

1. **内容长度**: Query 参数有长度限制，大量内容建议使用路由 params
2. **PDF 显示**: 需要 PDF URL 支持跨域访问
3. **安全性**: HTML 内容会直接渲染，注意 XSS 防护
4. **依赖**: 使用了 `marked` 库渲染 Markdown

## 🔗 路由配置

```typescript
// router.ts
{
  path: '/content/:data?',
  name: 'content',
  component: ContentView
}
```

## 💡 最佳实践

1. **标题国际化**: 使用 `t()` 函数翻译标题
2. **内容分离**: 将长内容存储在单独的常量或文件中
3. **类型安全**: 使用 TypeScript 类型定义内容结构
4. **错误处理**: 添加内容加载失败的提示

## 🎯 下一步

- [ ] 可以添加内容加载动画
- [ ] 可以支持从远程 URL 加载内容
- [ ] 可以添加内容搜索功能
- [ ] 可以支持打印/导出功能
