<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="glass sticky top-0 z-50 px-4 py-4 flex items-center border-b border-blue-100 bg-white/80 backdrop-blur-md">
      <button 
        @click="goBack" 
        class="mr-3 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center shadow-md"
      >
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-lg font-bold text-gray-800 truncate flex-1">{{ title }}</h1>
    </header>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto">
      <div class="max-w-4xl mx-auto p-6">
        <!-- Markdown 渲染 -->
        <div 
          v-if="contentType === 'markdown'" 
          class="prose prose-blue max-w-none"
          v-html="renderedMarkdown"
        ></div>

        <!-- HTML 渲染 -->
        <div 
          v-else-if="contentType === 'html'" 
          class="content-html"
          v-html="content"
        ></div>

        <!-- PDF 渲染 -->
        <div v-else-if="contentType === 'pdf'" class="pdf-container">
          <iframe 
            :src="content" 
            class="w-full h-screen border-0 rounded-lg shadow-lg"
            frameborder="0"
          ></iframe>
        </div>

        <!-- 纯文本渲染 -->
        <div v-else class="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {{ content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';

const route = useRoute();
const router = useRouter();

// 页面数据
const title = ref('');
const content = ref('');
const contentType = ref<'markdown' | 'html' | 'pdf' | 'text'>('text');

// Markdown 渲染
const renderedMarkdown = computed(() => {
  if (contentType.value === 'markdown') {
    return marked(content.value);
  }
  return '';
});

// 返回上一页
const goBack = () => {
  router.back();
};

// 初始化页面数据
onMounted(() => {
  // 从路由参数获取数据
  if (route.query.title) {
    title.value = route.query.title as string;
  }
  
  if (route.query.content) {
    content.value = route.query.content as string;
  }
  
  if (route.query.type) {
    contentType.value = route.query.type as 'markdown' | 'html' | 'pdf' | 'text';
  }

  // 或者从路由 state 获取数据（更适合大量内容）
  if (route.params.data) {
    const data = JSON.parse(route.params.data as string);
    title.value = data.title || '';
    content.value = data.content || '';
    contentType.value = data.type || 'text';
  }
});
</script>

<style scoped>
/* Markdown 样式 */
.prose {
  color: #1f2937;
}

.prose :deep(h1) {
  font-size: 1.875rem;
  font-weight: bold;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #111827;
}

.prose :deep(h2) {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #111827;
}

.prose :deep(h3) {
  font-size: 1.25rem;
  font-weight: bold;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #111827;
}

.prose :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.75;
}

.prose :deep(ul), .prose :deep(ol) {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.prose :deep(li) {
  margin-bottom: 0.5rem;
}

.prose :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.prose :deep(a:hover) {
  color: #1d4ed8;
}

.prose :deep(code) {
  background-color: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: monospace;
  color: #2563eb;
}

.prose :deep(pre) {
  background-color: #111827;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.prose :deep(pre code) {
  background-color: transparent;
  color: #f3f4f6;
  padding: 0;
}

.prose :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  font-style: italic;
  color: #4b5563;
  margin: 1rem 0;
}

.prose :deep(img) {
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.prose :deep(th) {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  text-align: left;
}

.prose :deep(td) {
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
}

/* HTML 内容样式 */
.content-html :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.content-html :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.content-html :deep(a:hover) {
  color: #1d4ed8;
}

/* PDF 容器 */
.pdf-container {
  width: 100%;
  min-height: 80vh;
}
</style>
