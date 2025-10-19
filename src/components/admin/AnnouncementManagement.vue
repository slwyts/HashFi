<template>
  <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">公告管理</h2>
        <p class="text-sm text-gray-500 mt-1">Announcement Management</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
      >
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          发布公告
        </span>
      </button>
    </div>

    <!-- 公告列表 -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="text-gray-500 mt-2">加载中...</p>
    </div>

    <div v-else-if="announcements.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
      <p class="text-gray-500">暂无公告</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="announcement in announcements"
        :key="announcement.id"
        class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-gray-800">{{ announcement.title }}</h3>
              <span
                :class="[
                  'px-2 py-1 text-xs rounded-full',
                  announcement.type === 'urgent' ? 'bg-red-100 text-red-600' :
                  announcement.type === 'important' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                ]"
              >
                {{ announcement.type === 'urgent' ? '紧急' : announcement.type === 'important' ? '重要' : '普通' }}
              </span>
              <span :class="announcement.active ? 'text-green-600 text-xs' : 'text-red-600 text-xs'">
                {{ announcement.active ? '已发布' : '已隐藏' }}
              </span>
            </div>
            <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ announcement.content }}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{{ new Date(announcement.createdAt).toLocaleString('zh-CN') }}</span>
            </div>
          </div>
          <div class="flex gap-2 ml-4">
            <button
              @click="openEditModal(announcement)"
              class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              编辑
            </button>
            <button
              @click="deleteAnnouncement(announcement.id)"
              class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑/创建模态框 -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">{{ editingAnnouncement ? '编辑公告' : '发布公告' }}</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入公告标题"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              公告内容
              <span class="text-xs text-gray-400 ml-2">(支持 Markdown 格式)</span>
            </label>
            <textarea
              v-model="formData.content"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows="8"
              placeholder="输入公告内容，支持 Markdown 语法&#10;&#10;例如：&#10;# 大标题&#10;## 小标题&#10;**粗体** *斜体*&#10;- 列表项&#10;[链接](https://example.com)"
            ></textarea>
            
            <!-- Markdown 预览 -->
            <details class="mt-2">
              <summary class="text-xs text-blue-600 cursor-pointer hover:underline">
                👁️ 预览效果
              </summary>
              <div class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none">
                <div v-html="renderMarkdown(formData.content)"></div>
              </div>
            </details>
            
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="md in markdownShortcuts"
                :key="md.label"
                @click="insertMarkdown(md.syntax)"
                type="button"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-all"
              >
                {{ md.label }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">公告类型</label>
              <CustomSelect
                v-model="formData.type"
                :options="typeOptions"
                placeholder="选择公告类型"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">发布状态</label>
              <CustomSelect
                v-model="formData.active"
                :options="statusOptions"
                placeholder="选择发布状态"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveAnnouncement"
            :disabled="saving"
            class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import CustomSelect, { type SelectOption } from './CustomSelect.vue';
import { toast } from '@/composables/useToast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'important' | 'urgent';
  active: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://hashfi-api.your-worker.workers.dev';

const announcements = ref<Announcement[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingAnnouncement = ref<Announcement | null>(null);
const saving = ref(false);

const markdownShortcuts = [
  { label: '粗体', syntax: '**粗体**' },
  { label: '斜体', syntax: '*斜体*' },
  { label: '标题', syntax: '## 标题' },
  { label: '链接', syntax: '[链接文字](https://example.com)' },
  { label: '列表', syntax: '- 列表项' },
  { label: '代码', syntax: '`代码`' },
];

// 下拉框选项
const typeOptions: SelectOption[] = [
  { value: 'normal', label: '普通公告', icon: '📢', description: '一般信息通知' },
  { value: 'important', label: '重要公告', icon: '⚠️', description: '重要事项提醒' },
  { value: 'urgent', label: '紧急公告', icon: '🚨', description: '紧急情况通知' },
];

const statusOptions: SelectOption[] = [
  { value: true, label: '立即发布', icon: '✅', description: '公告将立即显示在首页' },
  { value: false, label: '保存草稿', icon: '📦', description: '暂不发布，保存到草稿箱' },
];

const formData = ref({
  title: '',
  content: '',
  type: 'normal' as 'normal' | 'important' | 'urgent',
  active: true,
});

const loadAnnouncements = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${API_URL}/announcements`);
    if (!response.ok) throw new Error('Failed to fetch announcements');
    const data = await response.json();
    announcements.value = data.announcements || [];
  } catch (error) {
    console.error('Failed to load announcements:', error);
    toast.error('加载公告失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingAnnouncement.value = null;
  formData.value = {
    title: '',
    content: '',
    type: 'normal',
    active: true,
  };
  showModal.value = true;
};

const openEditModal = (announcement: Announcement) => {
  editingAnnouncement.value = announcement;
  formData.value = {
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    active: announcement.active,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingAnnouncement.value = null;
};

// 简单的 Markdown 渲染
const renderMarkdown = (text: string): string => {
  if (!text) return '';
  
  return text
    // 标题
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    // 斜体
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
    // 代码
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    // 列表
    .replace(/^\- (.+)$/gim, '<li class="ml-4">• $1</li>')
    // 换行
    .replace(/\n/g, '<br>');
};

// 插入 Markdown 语法
const insertMarkdown = (syntax: string) => {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = formData.value.content;
  
  formData.value.content = text.substring(0, start) + syntax + text.substring(end);
  
  // 设置光标位置
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + syntax.length, start + syntax.length);
  }, 0);
};

const saveAnnouncement = async () => {
  saving.value = true;
  try {
    const token = localStorage.getItem('admin_signature');
    if (!token) {
      toast.error('请先进行签名认证');
      return;
    }

    const method = editingAnnouncement.value ? 'PUT' : 'POST';
    const url = editingAnnouncement.value
      ? `${API_URL}/announcements/${editingAnnouncement.value.id}`
      : `${API_URL}/announcements`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(formData.value),
    });

    if (!response.ok) throw new Error('Failed to save announcement');

    await loadAnnouncements();
    closeModal();
    toast.success(editingAnnouncement.value ? '更新成功' : '发布成功');
  } catch (error) {
    console.error('Failed to save announcement:', error);
    toast.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const deleteAnnouncement = async (id: string) => {
  if (!confirm('确定要删除这条公告吗?')) return;

  try {
    const token = localStorage.getItem('admin_signature');
    if (!token) {
      toast.error('请先进行签名认证');
      return;
    }

    const response = await fetch(`${API_URL}/announcements/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to delete announcement');

    await loadAnnouncements();
    toast.success('删除成功');
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    toast.error('删除失败');
  }
};

onMounted(() => {
  loadAnnouncements();
});
</script>
