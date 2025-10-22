<template>
  <div class="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          平台内容管理
        </h2>
        <p class="text-sm text-gray-500 mt-1">管理平台展示的内容信息</p>
      </div>
      <div class="flex items-center gap-2">
        <div :class="[
          'px-3 py-1 rounded-full text-xs font-semibold',
          hasChanges ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        ]">
          {{ hasChanges ? '有未保存的更改' : '已保存' }}
        </div>
      </div>
    </div>

    <!-- 内容类型选择 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <button
        v-for="type in contentTypes"
        :key="type.key"
        @click="currentType = type.key"
        :class="[
          'p-4 rounded-xl border-2 transition-all text-left',
          currentType === type.key
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-blue-300'
        ]"
      >
        <div class="flex items-center gap-3">
          <div :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            currentType === type.key ? 'bg-blue-500' : 'bg-gray-200'
          ]">
            <span class="text-xl">{{ type.icon }}</span>
          </div>
          <div>
            <div :class="[
              'font-semibold',
              currentType === type.key ? 'text-blue-900' : 'text-gray-700'
            ]">
              {{ type.name }}
            </div>
            <div class="text-xs text-gray-500">{{ type.description }}</div>
          </div>
        </div>
      </button>
    </div>

    <!-- 编辑器 -->
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          内容编辑 (Markdown 格式)
        </label>
        <textarea
          v-model="editingContent"
          @input="hasChanges = true"
          class="w-full h-96 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="输入 Markdown 格式的内容..."
        ></textarea>
        <p class="text-xs text-gray-500 mt-2">
          支持 Markdown 语法，包括标题、列表、链接、粗体等
        </p>
      </div>

      <!-- 预览区域 -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          预览效果
        </label>
        <div class="border border-gray-300 rounded-xl p-6 bg-gray-50 max-h-96 overflow-y-auto">
          <div v-if="editingContent" v-html="renderedContent" class="markdown-content"></div>
          <div v-else class="text-gray-400 text-center py-8">
            暂无内容，请在上方编辑器中输入内容
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3">
        <button
          @click="saveContent"
          :disabled="!hasChanges || isSaving"
          :class="[
            'flex-1 py-3 rounded-xl font-semibold transition-all',
            hasChanges && !isSaving
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          ]"
        >
          <span v-if="isSaving" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存中...
          </span>
          <span v-else>保存更改</span>
        </button>
        <button
          @click="loadContent"
          :disabled="isSaving"
          class="px-6 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
        >
          刷新内容
        </button>
        <button
          @click="resetContent"
          :disabled="!hasChanges || isSaving"
          class="px-6 py-3 rounded-xl font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          撤销更改
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { marked } from 'marked';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const WORKER_API = import.meta.env.VITE_WORKER_API || 'https://hashfi-api.a3144390867.workers.dev';

interface ContentType {
  key: string;
  name: string;
  description: string;
  icon: string;
}

const contentTypes: ContentType[] = [
  {
    key: 'contactUs',
    name: '联系我们',
    description: '平台联系方式和社交媒体',
    icon: '📧'
  },
  // 可以后续扩展更多内容类型
  // {
  //   key: 'aboutUs',
  //   name: '关于我们',
  //   description: '平台介绍和愿景',
  //   icon: '📖'
  // },
];

const currentType = ref<string>('contactUs');
const editingContent = ref<string>('');
const originalContent = ref<string>('');
const hasChanges = ref(false);
const isSaving = ref(false);

// Markdown 渲染
const renderedContent = computed(() => {
  if (!editingContent.value) return '';
  try {
    return marked(editingContent.value);
  } catch (error) {
    console.error('Markdown 渲染错误:', error);
    return '<p class="text-red-500">Markdown 渲染失败</p>';
  }
});

// 加载内容
const loadContent = async () => {
  try {
    const response = await fetch(`${WORKER_API}/platform-content/${currentType.value}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      editingContent.value = data.data.content || '';
      originalContent.value = data.data.content || '';
      hasChanges.value = false;
    } else {
      // 如果没有内容，加载默认模板
      loadDefaultContent();
    }
  } catch (error) {
    console.error('加载内容失败:', error);
    // 加载失败时使用默认内容
    loadDefaultContent();
    toast.warning('未找到保存的内容，已加载默认模板');
  }
};

// 加载默认内容模板
const loadDefaultContent = () => {
  const templates: Record<string, string> = {
    contactUs: `# 联系我们

## 📧 官方邮箱

**通用咨询**：contact@hashfi.io

**技术支持**：support@hashfi.io

**商务合作**：business@hashfi.io

## 💬 社交媒体

**Telegram**：@HashFi_Official

**Twitter**：@HashFi_DeFi`,
  };
  
  editingContent.value = templates[currentType.value] || '';
  originalContent.value = editingContent.value;
  hasChanges.value = false;
};

// 保存内容
const saveContent = async () => {
  if (!hasChanges.value || isSaving.value) return;
  
  isSaving.value = true;
  try {
    const response = await fetch(`${WORKER_API}/platform-content/${currentType.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: editingContent.value,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      originalContent.value = editingContent.value;
      hasChanges.value = false;
      toast.success('内容保存成功！');
    } else {
      throw new Error(data.message || '保存失败');
    }
  } catch (error: any) {
    console.error('保存内容失败:', error);
    toast.error(`保存失败: ${error.message}`);
  } finally {
    isSaving.value = false;
  }
};

// 重置内容
const resetContent = () => {
  editingContent.value = originalContent.value;
  hasChanges.value = false;
  toast.info('已撤销所有更改');
};

// 监听内容类型切换
watch(currentType, () => {
  if (hasChanges.value) {
    if (!confirm('当前有未保存的更改，切换后将丢失，是否继续？')) {
      // 恢复到之前的类型
      return;
    }
  }
  loadContent();
});

onMounted(() => {
  loadContent();
});
</script>

<style scoped>
/* Markdown 内容样式 */
.markdown-content {
  color: rgb(31 41 55);
}

.markdown-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  margin-top: 1.5rem;
  color: rgb(17 24 39);
}

.markdown-content :deep(h1:first-child) {
  margin-top: 0;
}

.markdown-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  margin-top: 1.25rem;
  color: rgb(31 41 55);
}

.markdown-content :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
  color: rgb(55 65 81);
}

.markdown-content :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.625;
}

.markdown-content :deep(strong) {
  font-weight: 700;
  color: rgb(17 24 39);
}

.markdown-content :deep(a) {
  color: rgb(37 99 235);
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: rgb(30 64 175);
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 1rem;
  margin-left: 1.5rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(code) {
  background-color: rgb(229 231 235);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
}

.markdown-content :deep(pre) {
  background-color: rgb(31 41 55);
  color: rgb(243 244 246);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.markdown-content :deep(hr) {
  border-color: rgb(209 213 219);
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
</style>
