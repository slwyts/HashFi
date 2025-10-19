<template>
  <div class="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">轮播图管理</h2>
        <p class="text-sm text-gray-500 mt-1">Banner Carousel Management</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
      >
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加轮播图
        </span>
      </button>
    </div>

    <!-- 轮播图列表 -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="text-gray-500 mt-2">加载中...</p>
    </div>

    <div v-else-if="banners.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-gray-500">暂无轮播图</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="banner in banners"
        :key="banner.id"
        class="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all"
      >
        <img
          :src="banner.imageUrl"
          :alt="banner.title"
          class="w-32 h-20 object-cover rounded-lg"
        />
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800">{{ banner.title }}</h3>
          <p class="text-sm text-gray-500">{{ banner.description }}</p>
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>链接: {{ banner.link || '无' }}</span>
            <span>顺序: {{ banner.order }}</span>
            <span :class="banner.active ? 'text-green-600' : 'text-red-600'">
              {{ banner.active ? '启用' : '禁用' }}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="openEditModal(banner)"
            class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            编辑
          </button>
          <button
            @click="deleteBanner(banner.id)"
            class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            删除
          </button>
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
        <h3 class="text-xl font-bold mb-4">{{ editingBanner ? '编辑轮播图' : '添加轮播图' }}</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入标题"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              v-model="formData.description"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="输入描述"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              轮播图图片
            </label>
            
            <!-- 图片预览 -->
            <div v-if="formData.imageUrl" class="mb-3">
              <img 
                :src="formData.imageUrl" 
                alt="预览" 
                class="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
              />
            </div>

            <!-- 图片URL输入框 -->
            <div class="mb-3">
              <input
                v-model="formData.imageUrl"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入图片URL，如：/banner_01.png 或 https://..."
              />
              <p class="text-xs text-gray-400 mt-1">
                💡 可以使用 public 目录的图片：/banner_01.png、/icons/hashfi_yellow.png
              </p>
            </div>

            <!-- 分割线 -->
            <div class="flex items-center gap-3 my-3">
              <div class="flex-1 border-t border-gray-300"></div>
              <span class="text-xs text-gray-400">或者上传新图片</span>
              <div class="flex-1 border-t border-gray-300"></div>
            </div>

            <!-- 上传按钮 -->
            <div class="flex gap-2">
              <label class="flex-1 cursor-pointer">
                <div class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-center border-2 border-dashed border-blue-300">
                  <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ uploading ? '压缩上传中...' : '点击上传图片' }}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageUpload"
                  :disabled="uploading"
                />
              </label>
            </div>
            
            <p class="text-xs text-gray-400 mt-2">
              � 上传文件会自动压缩至500KB以内并转为Base64存储
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">链接 (可选)</label>
            <input
              v-model="formData.link"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">显示顺序</label>
              <input
                v-model.number="formData.order"
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="数字越小越靠前"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">显示状态</label>
              <CustomSelect
                v-model="formData.active"
                :options="statusOptions"
                placeholder="选择显示状态"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveBanner"
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

const API_URL = import.meta.env.VITE_API_URL || 'https://hashfi-api.your-worker.workers.dev';

const banners = ref<Banner[]>([]);
const loading = ref(false);
const showModal = ref(false);
const editingBanner = ref<Banner | null>(null);
const saving = ref(false);
const uploading = ref(false);

// 下拉框选项
const statusOptions: SelectOption[] = [
  { value: true, label: '立即启用', icon: '✅', description: '轮播图将显示在首页' },
  { value: false, label: '暂不显示', icon: '🚫', description: '保存但不显示在首页' },
];

const formData = ref({
  title: '',
  description: '',
  imageUrl: '',
  link: '',
  order: 0,
  active: true,
});

const loadBanners = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${API_URL}/banners`);
    if (!response.ok) throw new Error('Failed to fetch banners');
    const data = await response.json();
    banners.value = data.banners || [];
  } catch (error) {
    console.error('Failed to load banners:', error);
    toast.error('加载轮播图失败');
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingBanner.value = null;
  formData.value = {
    title: '',
    description: '',
    imageUrl: '',
    link: '',
    order: banners.value.length,
    active: true,
  };
  showModal.value = true;
};

const openEditModal = (banner: Banner) => {
  editingBanner.value = banner;
  formData.value = {
    title: banner.title,
    description: banner.description,
    imageUrl: banner.imageUrl,
    link: banner.link || '',
    order: banner.order,
    active: banner.active,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingBanner.value = null;
};

// 图片压缩函数
const compressImage = (file: File, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 限制最大宽度为 1920px
        const maxWidth = 1920;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        // 二分法查找最佳压缩质量
        let quality = 0.9;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        
        // 如果图片太大，降低质量
        while (compressed.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 处理图片上传
const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    toast.warning('请上传图片文件！');
    return;
  }
  
  // 检查文件大小 (限制10MB原图)
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('图片太大了！请选择小于10MB的图片');
    return;
  }
  
  try {
    uploading.value = true;
    
    // 压缩图片到500KB以内
    const compressed = await compressImage(file, 500);
    
    formData.value.imageUrl = compressed;
    
    toast.success('图片上传成功！已压缩优化');
  } catch (error) {
    console.error('图片处理失败:', error);
    toast.error('图片处理失败，请重试');
  } finally {
    uploading.value = false;
    // 清空 input，允许重复上传同一文件
    input.value = '';
  }
};

const saveBanner = async () => {
  saving.value = true;
  try {
    const token = localStorage.getItem('admin_signature');
    if (!token) {
      toast.error('请先进行签名认证');
      return;
    }

    const method = editingBanner.value ? 'PUT' : 'POST';
    const url = editingBanner.value
      ? `${API_URL}/banners/${editingBanner.value.id}`
      : `${API_URL}/banners`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(formData.value),
    });

    if (!response.ok) throw new Error('Failed to save banner');

    await loadBanners();
    closeModal();
    toast.success(editingBanner.value ? '更新成功' : '创建成功');
  } catch (error) {
    console.error('Failed to save banner:', error);
    toast.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const deleteBanner = async (id: string) => {
  if (!confirm('确定要删除这个轮播图吗?')) return;

  try {
    const token = localStorage.getItem('admin_signature');
    if (!token) {
      toast.error('请先进行签名认证');
      return;
    }

    const response = await fetch(`${API_URL}/banners/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to delete banner');

    await loadBanners();
    toast.success('删除成功');
  } catch (error) {
    console.error('Failed to delete banner:', error);
    toast.error('删除失败');
  }
};

onMounted(() => {
  loadBanners();
});
</script>
