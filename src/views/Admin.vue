<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
    <!-- 顶部标题栏 -->
    <div class="bg-white border-b border-blue-100 sticky top-0 z-10 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              管理员控制面板
            </h1>
            <p class="text-sm text-gray-500 mt-1">HashFi Platform Administration</p>
          </div>
          <div class="flex items-center gap-4">
            <div v-if="!isAuthenticated" class="text-right">
              <button
                @click="authenticate"
                class="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                签名认证
              </button>
            </div>
            <div v-else class="text-right">
              <p class="text-xs text-gray-400">认证状态</p>
              <div class="flex items-center gap-2 mt-1">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-sm font-semibold text-green-600">已认证</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400">系统状态</p>
              <div class="flex items-center gap-2 mt-1">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  systemStatus.isPaused ? 'bg-red-500' : 'bg-green-500'
                ]"></div>
                <span :class="[
                  'text-sm font-semibold',
                  systemStatus.isPaused ? 'text-red-600' : 'text-green-600'
                ]">
                  {{ systemStatus.isPaused ? '已暂停' : '运行中' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限检查 -->
    <div v-if="!isAdmin" class="max-w-7xl mx-auto px-6 py-20">
      <div class="bg-white rounded-2xl p-12 text-center shadow-lg border border-red-100">
        <div class="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-3">访问受限</h2>
        <p class="text-gray-600">仅管理员可访问此页面</p>
      </div>
    </div>

    <!-- 管理员控制面板 -->
    <div v-else class="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-6 space-y-3 md:space-y-6">
      <!-- Tab 导航 -->
      <div class="bg-white rounded-xl p-1 md:p-2 shadow-sm border border-blue-100">
        <div class="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'px-2 md:px-4 py-2 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all duration-200',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            ]"
          >
            {{ tab.name }}
          </button>
        </div>
      </div>

      <!-- 仪表盘 -->
      <Dashboard v-show="activeTab === 'dashboard'" />

      <!-- 创世节点管理 -->
      <GenesisManagement v-show="activeTab === 'genesis'" />
      
      <!-- 数据管理中心 -->
      <DataManagement v-show="activeTab === 'data'" />

      <!-- 用户管理 -->
      <UserManagement v-show="activeTab === 'users'" />

      <!-- 轮播图管理 -->
      <BannerManagement v-show="activeTab === 'banners'" />

      <!-- 公告管理 -->
      <AnnouncementManagement v-show="activeTab === 'announcements'" />

      <!-- 系统设置 -->
      <SystemSettings v-show="activeTab === 'settings'" />

      <!-- 高级操作 -->
      <AdvancedOperations v-show="activeTab === 'advanced'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAccount, useSignMessage } from '@wagmi/vue';
import { useAdminData } from '../composables/useAdminData';
import { useToast } from '../composables/useToast';
import Dashboard from '../components/admin/Dashboard.vue';
import GenesisManagement from '../components/admin/GenesisManagement.vue';
import DataManagement from '../components/admin/DataManagement.vue';
import UserManagement from '../components/admin/UserManagement.vue';
import BannerManagement from '../components/admin/BannerManagement.vue';
import AnnouncementManagement from '../components/admin/AnnouncementManagement.vue';
import SystemSettings from '../components/admin/SystemSettings.vue';
import AdvancedOperations from '../components/admin/AdvancedOperations.vue';

const toast = useToast();

const {
  isAdmin,
  systemStatus,
  refreshAll,
} = useAdminData();

const { address } = useAccount();
const { signMessageAsync } = useSignMessage();
const isAuthenticated = ref(false);

const activeTab = ref<'dashboard' | 'genesis' | 'data' | 'users' | 'settings' | 'advanced' | 'banners' | 'announcements'>('dashboard');

const tabs = [
  { key: 'dashboard' as const, name: '仪表盘' },
  { key: 'genesis' as const, name: '创世节点' },
  { key: 'data' as const, name: '数据中心' },
  { key: 'users' as const, name: '用户管理' },
  { key: 'banners' as const, name: '轮播图' },
  { key: 'announcements' as const, name: '公告' },
  { key: 'settings' as const, name: '系统设置' },
  { key: 'advanced' as const, name: '高级操作' },
];

const authenticate = async () => {
  try {
    if (!address.value) {
      toast.error('请先连接钱包');
      return;
    }

    const message = `HashFi Admin Authentication\nTimestamp: ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    
    // 保存签名到 localStorage (简单认证,后端会装个样子验证)
    localStorage.setItem('admin_signature', signature);
    isAuthenticated.value = true;
    
    toast.success('认证成功！');
  } catch (error) {
    console.error('签名失败:', error);
    toast.error('签名失败');
  }
};

onMounted(() => {
  refreshAll();
  
  // 检查是否已经认证过
  const savedSignature = localStorage.getItem('admin_signature');
  if (savedSignature) {
    isAuthenticated.value = true;
  }
});
</script>
