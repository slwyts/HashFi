import { ref, computed } from 'vue';
import { useReadContract } from '@wagmi/vue';
import abi from '../../contract/abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// 公告接口
export interface Announcement {
  id: number;
  title: string;
  summary: string;
  content: string;
  timestamp: number;
  isImportant: boolean;
  isOnChain: boolean;
  author?: string;
}

// Banner 接口
export interface Banner {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  link?: string;
  announcementId?: number;
}

// 本地内嵌公告（代码中预设的公告）
const localAnnouncements: Announcement[] = [
  {
    id: 1,
    title: '欢迎使用 HashFi DApp',
    summary: '开始您的 DeFi 挖矿之旅，质押 USDT 获取 HAF 收益',
    content: `
      <h2>欢迎来到 HashFi</h2>
      <p>HashFi 是一个创新的 DeFi 挖矿平台，提供以下功能：</p>
      <ul>
        <li>💎 质押 USDT 获取稳定收益</li>
        <li>🔄 HAF/USDT 代币兑换</li>
        <li>👥 推荐奖励机制</li>
        <li>⚡ 创世节点分红</li>
      </ul>
      <p>立即开始质押，享受高额收益！</p>
    `,
    timestamp: Math.floor(Date.now() / 1000),
    isImportant: true,
    isOnChain: false
  },
  {
    id: 2,
    title: '质押教程',
    summary: '了解如何质押 USDT 并开始赚取收益',
    content: `
      <h2>质押操作步骤</h2>
      <ol>
        <li>连接您的钱包</li>
        <li>授权 USDT（建议授权无限额度）</li>
        <li>选择质押等级（青铜/白银/黄金/钻石）</li>
        <li>输入质押金额</li>
        <li>确认交易并等待上链</li>
      </ol>
      <p><strong>注意：</strong>不同等级有不同的质押要求和收益率。</p>
    `,
    timestamp: Math.floor(Date.now() / 1000) - 86400,
    isImportant: false,
    isOnChain: false
  },
  {
    id: 3,
    title: '推荐奖励说明',
    summary: '邀请好友，赚取推荐佣金',
    content: `
      <h2>推荐奖励机制</h2>
      <p>通过推荐链接邀请好友注册并质押，您将获得：</p>
      <ul>
        <li>🎯 直推奖励：好友质押金额的一定比例</li>
        <li>📊 团队业绩奖励：根据团队总业绩获得额外收益</li>
        <li>🏆 等级晋升：达到业绩要求可升级会员等级</li>
      </ul>
      <p>复制您的邀请链接，分享给好友开始赚取佣金！</p>
    `,
    timestamp: Math.floor(Date.now() / 1000) - 172800,
    isImportant: false,
    isOnChain: false
  }
];

// 本地 Banner 数据
const localBanners: Banner[] = [
  {
    id: 1,
    image: '/banner_01.png',
    title: 'HashFi DeFi 挖矿平台',
    subtitle: '质押即挖矿，收益每日发放',
    announcementId: 1
  },
  {
    id: 2,
    image: '/banner_01.png', // 可以替换为不同的图片
    title: '创世节点招募中',
    subtitle: '成为创世节点，享受平台分红',
    link: '/genesis-node'
  }
];

export function useAnnouncements() {
  const allAnnouncements = ref<Announcement[]>([...localAnnouncements]);
  const allBanners = ref<Banner[]>([...localBanners]);

  // TODO: 从合约读取链上公告
  // 这里预留接口，等合约添加公告管理功能后再实现
  /*
  const { data: onChainAnnouncements } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getAnnouncements',
    query: {
      refetchInterval: 60000, // 每分钟刷新一次
    }
  });
  */

  // 获取所有公告（本地 + 链上）
  const announcements = computed(() => {
    return allAnnouncements.value.sort((a, b) => b.timestamp - a.timestamp);
  });

  // 获取重要公告
  const importantAnnouncements = computed(() => {
    return announcements.value.filter(a => a.isImportant);
  });

  // 获取最新公告（用于轮播）
  const latestAnnouncements = computed(() => {
    return announcements.value.slice(0, 5);
  });

  // 获取 Banner 列表
  const banners = computed(() => {
    return allBanners.value;
  });

  // 根据 ID 获取公告详情
  const getAnnouncementById = (id: number) => {
    return announcements.value.find(a => a.id === id);
  };

  // 获取未读公告（排除已标记为已读的）
  const getUnreadAnnouncements = () => {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    return importantAnnouncements.value.filter(a => !readIds.includes(a.id));
  };

  // 标记公告为已读
  const markAsRead = (id: number) => {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
    }
  };

  // 添加新公告（管理员功能）
  const addAnnouncement = (announcement: Omit<Announcement, 'id' | 'timestamp'>) => {
    const newId = Math.max(...allAnnouncements.value.map(a => a.id), 0) + 1;
    const newAnnouncement: Announcement = {
      ...announcement,
      id: newId,
      timestamp: Math.floor(Date.now() / 1000),
    };
    allAnnouncements.value.unshift(newAnnouncement);
    return newAnnouncement;
  };

  // 更新公告（管理员功能）
  const updateAnnouncement = (id: number, updates: Partial<Omit<Announcement, 'id' | 'timestamp' | 'isOnChain'>>) => {
    const index = allAnnouncements.value.findIndex(a => a.id === id);
    if (index !== -1) {
      const current = allAnnouncements.value[index];
      if (current) {
        allAnnouncements.value[index] = {
          ...current,
          ...updates
        };
        return true;
      }
    }
    return false;
  };

  // 删除公告（管理员功能）
  const deleteAnnouncement = (id: number) => {
    const index = allAnnouncements.value.findIndex(a => a.id === id);
    const announcement = allAnnouncements.value[index];
    if (index !== -1 && announcement && !announcement.isOnChain) {
      allAnnouncements.value.splice(index, 1);
      return true;
    }
    return false;
  };

  return {
    announcements,
    importantAnnouncements,
    latestAnnouncements,
    banners,
    getAnnouncementById,
    getUnreadAnnouncements,
    markAsRead,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
  };
}
