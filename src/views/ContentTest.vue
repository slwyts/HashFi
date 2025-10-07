<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-6">通用内容页面测试</h1>
    
    <button 
      @click="showMarkdown"
      class="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700"
    >
      显示 Markdown 内容
    </button>
    
    <button 
      @click="showHTML"
      class="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700"
    >
      显示 HTML 内容
    </button>
    
    <button 
      @click="showText"
      class="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700"
    >
      显示纯文本内容
    </button>
    
    <button 
      @click="showPDF"
      class="w-full bg-orange-600 text-white py-3 rounded-xl hover:bg-orange-700"
    >
      显示 PDF 内容
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const showMarkdown = () => {
  router.push({
    path: '/content',
    query: {
      title: 'Markdown 示例',
      type: 'markdown',
      content: `
# Markdown 示例文档

这是一个 **Markdown** 格式的示例文档。

## 功能特性

- 支持标题
- 支持列表
- 支持**粗体**和*斜体*
- 支持代码块

### 代码示例

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### 表格示例

| 功能 | 支持 |
|------|------|
| Markdown | ✅ |
| HTML | ✅ |
| PDF | ✅ |

> 这是一个引用块示例
      `
    }
  });
};

const showHTML = () => {
  router.push({
    path: '/content',
    query: {
      title: 'HTML 内容示例',
      type: 'html',
      content: `
        <h1 style="color: #2563eb;">HTML 内容示例</h1>
        <p>这是一段 HTML 内容。</p>
        <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
          <h3>特色功能</h3>
          <ul>
            <li>完全的 HTML 支持</li>
            <li>自定义样式</li>
            <li>富文本展示</li>
          </ul>
        </div>
      `
    }
  });
};

const showText = () => {
  router.push({
    path: '/content',
    query: {
      title: '纯文本示例',
      type: 'text',
      content: `这是一个纯文本示例。

支持多行文本
保留换行和空格

适合简单的文本内容展示。`
    }
  });
};

const showPDF = () => {
  router.push({
    path: '/content',
    query: {
      title: 'PDF 文档示例',
      type: 'pdf',
      content: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  });
};
</script>
