<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="glass sticky top-0 z-40 px-4 py-4 flex items-center border-b border-blue-100 bg-white/80 backdrop-blur-md">
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

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

// 加载页面内容的函数
const loadContent = () => {
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

  // 或者从路由 params.data 获取数据（支持base64编码的JSON）
  if (route.params.data) {
    try {
      const decodedData = atob(route.params.data as string);
      const data = JSON.parse(decodedData);
      
      // 检查是否是公告相关的类型
      if (data.type === 'announcement' && data.id) {
        // 加载特定公告详情
        loadAnnouncementDetail(data.id);
      } else if (data.type === 'announcement-list') {
        // 加载公告列表
        loadAnnouncementList();
      } else if (data.type === 'rules' && data.id) {
        // 加载规则说明
        loadRulesContent(data.id);
      } else {
        // 普通内容
        title.value = data.title || '';
        content.value = data.content || '';
        contentType.value = data.contentType || 'text';
      }
    } catch (e) {
      console.error('Failed to parse route data:', e);
    }
  }
};

// 初始化页面数据
onMounted(() => {
  loadContent();
});

// 监听路由变化，重新加载内容
watch(() => route.params.data, () => {
  loadContent();
});

// 加载公告详情
const loadAnnouncementDetail = async (id: string) => {
  title.value = t('common.loadingEllipsis');
  content.value = `<div class="text-center py-12"><p class="text-gray-500">${t('common.loadingEllipsis')}</p></div>`;
  contentType.value = 'html';
  
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    if (!API_URL) {
      title.value = t('common.error');
      content.value = `<p class="text-gray-500 text-center py-8">${t('common.apiNotConfigured')}</p>`;
      return;
    }
    
    const response = await fetch(`${API_URL}/announcements`);
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    
    const data = await response.json();
    const announcement = (data.announcements || []).find((a: any) => a.id === id);
    
    if (announcement) {
      title.value = announcement.title;
      content.value = announcement.content;
      contentType.value = 'html';
    } else {
      title.value = t('announcement.notFound');
      content.value = `<p class="text-gray-500 text-center py-8">${t('announcement.notFoundDesc')}</p>`;
      contentType.value = 'html';
    }
  } catch (error) {
    console.error('Failed to load announcement:', error);
    title.value = t('common.error');
    content.value = `<p class="text-red-500 text-center py-8">${t('common.loadFailed')}</p>`;
    contentType.value = 'html';
  }
};

// 加载公告列表
const loadAnnouncementList = async () => {
  title.value = t('announcement.all');
  
  // 显示加载中
  content.value = `<div class="text-center py-12"><p class="text-gray-500">${t('common.loadingEllipsis')}</p></div>`;
  contentType.value = 'html';
  
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    if (!API_URL) {
      content.value = `<div class="text-center py-12"><p class="text-gray-500">${t('common.apiNotConfigured')}</p></div>`;
      return;
    }
    
    const response = await fetch(`${API_URL}/announcements`);
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    
    const data = await response.json();
    const announcements = (data.announcements || [])
      .filter((a: any) => a.active)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // 生成公告列表 HTML
    let html = '<div class="space-y-4">';
    
    if (announcements.length === 0) {
      html += `<div class="text-center py-12"><p class="text-gray-500">${t('announcement.noAnnouncements')}</p></div>`;
    } else {
      for (const announcement of announcements) {
        const date = new Date(announcement.createdAt).toLocaleDateString();
        const typeIcon = announcement.type === 'urgent' ? '🚨' : announcement.type === 'important' ? '⚠️' : '📢';
        const typeLabel = announcement.type === 'urgent' ? '紧急' : announcement.type === 'important' ? '重要' : '普通';
        const badge = `<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">${typeIcon} ${typeLabel}</span>`;
        
        // 从 content 提取摘要（取前100个字符）
        const summary = announcement.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
        
        // 生成路由参数
        const routeData = btoa(JSON.stringify({ type: 'announcement', id: announcement.id }));
        
        html += `
          <div class="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100" data-announcement-route="${routeData}">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-lg text-gray-800 flex-1">${announcement.title}</h3>
              ${badge}
            </div>
            <p class="text-gray-600 text-sm mb-3">${summary}</p>
            <div class="flex items-center text-xs text-gray-400">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ${date}
            </div>
          </div>
        `;
      }
    }
    
    html += '</div>';
    content.value = html;
    
    // 添加点击事件监听（延迟执行确保DOM已更新）
    setTimeout(() => {
      const announcementCards = document.querySelectorAll('[data-announcement-route]');
      announcementCards.forEach(card => {
        card.addEventListener('click', () => {
          const routeData = card.getAttribute('data-announcement-route');
          if (routeData) {
            router.push({
              name: 'content',
              params: { data: routeData }
            });
          }
        });
      });
    }, 0);
  } catch (error) {
    console.error('Failed to load announcements:', error);
    content.value = `<div class="text-center py-12"><p class="text-red-500">${t('common.loadFailed')}</p></div>`;
  }
  
  contentType.value = 'html';
};

// 加载规则说明内容
const loadRulesContent = (ruleId: string) => {
  if (ruleId === 'staking') {
    title.value = t('rules.staking.title');
    content.value = t('rules.staking.fullMarkdown');
    contentType.value = 'markdown';
  }
};
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
