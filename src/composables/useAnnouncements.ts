import { ref, computed, onMounted } from 'vue';

// 公告接口 (与后端API一致)
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'important' | 'urgent';
  active: boolean;
  createdAt: string;
}

// Banner 接口 (与后端API一致)
export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  order: number;
  active: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export function useAnnouncements() {
  const allAnnouncements = ref<Announcement[]>([]);
  const allBanners = ref<Banner[]>([]);
  const loading = ref(false);

  // 从 API 加载公告
  const loadAnnouncements = async () => {
    if (!API_URL) {
      console.warn('API_URL not configured');
      return;
    }

    try {
      loading.value = true;
      const response = await fetch(`${API_URL}/announcements`);
      if (response.ok) {
        const data = await response.json();
        allAnnouncements.value = data.announcements || [];
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      loading.value = false;
    }
  };

  // 从 API 加载轮播图
  const loadBanners = async () => {
    if (!API_URL) {
      console.warn('API_URL not configured');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/banners`);
      if (response.ok) {
        const data = await response.json();
        allBanners.value = data.banners || [];
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  };

  // 初始化时加载数据
  onMounted(() => {
    loadAnnouncements();
    loadBanners();
  });

  // 获取所有已发布的公告，按创建时间倒序
  const announcements = computed(() => {
    return allAnnouncements.value
      .filter(a => a.active)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // 获取重要/紧急公告
  const importantAnnouncements = computed(() => {
    return announcements.value.filter(a => a.type === 'important' || a.type === 'urgent');
  });

  // 获取最新公告（用于轮播）
  const latestAnnouncements = computed(() => {
    return announcements.value.slice(0, 5);
  });

  // 获取已启用的 Banner 列表，按顺序排序
  const banners = computed(() => {
    return allBanners.value
      .filter(b => b.active)
      .sort((a, b) => a.order - b.order);
  });

  // 根据 ID 获取公告详情
  const getAnnouncementById = (id: string) => {
    return announcements.value.find(a => a.id === id);
  };

  // 获取未读公告（排除已标记为已读的）
  const getUnreadAnnouncements = () => {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    return importantAnnouncements.value.filter(a => !readIds.includes(a.id));
  };

  // 标记公告为已读
  const markAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
    }
  };

  // 刷新数据
  const refresh = async () => {
    await Promise.all([loadAnnouncements(), loadBanners()]);
  };

  return {
    announcements,
    importantAnnouncements,
    latestAnnouncements,
    banners,
    loading,
    getAnnouncementById,
    getUnreadAnnouncements,
    markAsRead,
    refresh
  };
}
