<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen">
    <!-- 用户信息卡片 - 现代化蓝色渐变 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-b-3xl shadow-xl overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10 flex items-center">
        <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-white text-2xl mr-4 shadow-lg border-2 border-white/30">
          {{ address ? address.substring(2, 4).toUpperCase() : '??' }}
        </div>
        <div>
          <p class="font-bold text-lg font-mono text-white">{{ formattedAddress }}</p>
          <span v-if="userLevel" :class="['inline-block text-xs font-semibold py-1 px-3 rounded-full mt-1 shadow-lg', userLevelStyle]">{{ t(userLevel) }}</span>
        </div>
      </div>
    </div>

    <div class="p-4">
      <!-- 资产卡片 -->
      <div class="bg-white p-6 rounded-2xl shadow-lg text-center border border-gray-100 -mt-6 relative z-10">
        <p class="text-sm text-gray-500 mb-1">{{ t('profilePage.totalAssets') }} (HAF)</p>
        <p class="text-5xl font-bold my-3 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          {{ totalHafBalance }}
        </p>
        <p class="text-sm text-gray-400 mb-5">≈ ${{ totalUsdValue }}</p>
        <div class="mt-4">
          <button 
            @click="router.push('/income')"
            class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
          >
            {{ t('profilePage.viewIncome') }}
          </button>
        </div>
      </div>
    </div>

    <div class="px-4 space-y-4">
      <!-- 功能区 1 -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <ul class="divide-y divide-gray-100">
          <li @click="router.push('/genesis-node')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <img src="/icons/ecosystem.svg" class="w-5 h-5 brightness-0 invert" alt="node icon">
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.applyNode') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li @click="showBindReferrerModal = true" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.bindReferrer') }}</span>
            </div>
             <div class="flex items-center">
                <span class="text-sm text-gray-500 mr-2 font-mono">{{ referrerDisplay }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- 管理员入口 (仅管理员可见) -->
      <div v-if="isAdmin" class="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg overflow-hidden">
        <div @click="router.push('/admin')" class="p-4 flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity group">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="font-bold text-white">{{ t('profilePage.adminPanel') }}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>

      <!-- 关于我们 & 联系我们 -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <ul class="divide-y divide-gray-100">
           <li @click="showInfo('aboutUs')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.aboutUs') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li @click="showInfo('contactUs')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors group">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-shadow">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span class="font-semibold text-gray-800">{{ t('profilePage.contactUs') }}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </li>
        </ul>
      </div>
    </div>

    <!-- 断开连接按钮 -->
    <div class="p-4 mt-4 mb-20">
        <button class="w-full bg-white text-red-500 font-bold py-3 rounded-2xl shadow-md hover:bg-red-50 transition-colors border border-red-200 hover:border-red-300">
          {{ t('profilePage.disconnect') }}
        </button>
    </div>

    <!-- 绑定推荐人模态框 -->
    <BindReferrerModal
      :visible="showBindReferrerModal"
      :owner-address="ownerAddress as string"
      :current-referrer="userInfo ? (userInfo as any[])[0] : undefined"
      :invite-address="inviteAddress"
      @close="showBindReferrerModal = false"
      @success="handleBindSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { useAccount, useReadContract, useBalance } from '@wagmi/vue';
import { formatEther, formatUnits } from 'viem';
import { abi } from '@/core/contract';
import BindReferrerModal from '@/components/BindReferrerModal.vue';
import { parseInviteCode, formatAddress } from '@/utils/invite';
import { toast } from '@/composables/useToast';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { address, isConnected } = useAccount();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const HAF_TOKEN_ADDRESS = CONTRACT_ADDRESS; // HAF 代币就是合约本身

// 读取合约 owner
const { data: ownerAddress } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'owner',
});

// 判断是否是管理员
const isAdmin = computed(() => {
  return address.value && ownerAddress.value && 
         address.value.toLowerCase() === (ownerAddress.value as string).toLowerCase();
});

// 读取用户信息
const userArgs = computed(() => address.value ? [address.value] as const : undefined);

const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: userArgs,
  query: {
    enabled: !!address.value,
  },
});

// 读取 HAF 余额
const { data: hafBalance } = useBalance({
  address: address,
  token: HAF_TOKEN_ADDRESS,
  query: {
    enabled: !!address.value,
  },
});

// 读取 HAF 价格
const { data: hafPriceData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'hafPrice',
});

// 读取可提取收益
const { data: claimableData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getClaimableRewards',
  args: address.value ? [address.value] : undefined,
  query: {
    enabled: !!address.value,
  },
});

// 计算总 HAF 资产（余额 + 可提取收益）
const totalHafBalance = computed(() => {
  if (!address.value) return '0.0000';
  
  const balance = hafBalance.value ? Number(formatEther(hafBalance.value.value)) : 0;
  const claimable = claimableData.value ? Number(formatEther((claimableData.value as any).totalClaimableHaf || 0n)) : 0;
  
  return (balance + claimable).toFixed(4);
});

// 计算美元价值
const totalUsdValue = computed(() => {
  if (!hafPriceData.value) return '0.00';
  
  const hafAmount = parseFloat(totalHafBalance.value);
  const hafPrice = Number(formatUnits(hafPriceData.value as bigint, 18)); // ✅ 18 位精度
  
  return (hafAmount * hafPrice).toFixed(2);
});

// 格式化地址
const formattedAddress = computed(() => {
  if (!address.value) return t('profilePage.notConnected');
  return `${address.value.substring(0, 6)}...${address.value.substring(address.value.length - 4)}`;
});

// 用户等级
const userLevel = computed(() => {
  if (!userInfo.value) return '';
  
  // userInfo 是数组: [referrer, teamLevel, totalStakedAmount, ...]
  const info = userInfo.value as any[];
  const totalInvested = Number(formatEther(info[2] || 0n)); // index 2 是 totalStakedAmount
  
  // 根据合约中的质押等级判断
  if (totalInvested >= 3000) return 'stakingPage.diamond';  // 钻石: 3000+ USDT
  if (totalInvested >= 1000) return 'stakingPage.gold';     // 黄金: 1000-2999 USDT  
  if (totalInvested >= 500) return 'stakingPage.silver';    // 白银: 500-999 USDT
  if (totalInvested >= 100) return 'stakingPage.bronze';    // 青铜: 100-499 USDT
  return ''; // 未投资
});

// 用户等级样式
const userLevelStyle = computed(() => {
  const level = userLevel.value;
  if (!level) return '';
  
  switch (level) {
    case 'stakingPage.bronze':
      return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-500/30';
    case 'stakingPage.silver':
      return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-500/30';
    case 'stakingPage.gold':
      return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-yellow-500/30';
    case 'stakingPage.diamond':
      return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-500/30';
    default:
      return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-500/30';
  }
});

// 推荐人显示
const referrerDisplay = computed(() => {
  if (!userInfo.value) return t('profilePage.notBound');
  
  const info = userInfo.value as any;
  const referrer = (info[0] || info.referrer) as string;
  
  // 检查是否为零地址
  if (!referrer || 
      referrer === '0x0000000000000000000000000000000000000000' ||
      referrer === '0x0') {
    return t('profilePage.notBound');
  }
  
  // 返回缩短的地址
  return `${referrer.substring(0, 6)}...${referrer.substring(referrer.length - 4)}`;
});

// 绑定推荐人模态框
const showBindReferrerModal = ref(false);

// 邀请人地址（从URL参数获取）
const inviteAddress = ref<string>('');

// 绑定成功回调
const handleBindSuccess = async () => {
  // 重新获取用户信息，不需要刷新页面
  try {
    await refetchUserInfo();
    showBindReferrerModal.value = false;
    
    // 清除URL中的invite参数
    if (route.query.invite) {
      router.replace({ path: '/profile' });
    }
  } catch (error) {
    console.error('Failed to refresh user info:', error);
  }
};

// 检测URL中的邀请参数并处理
const checkInviteFromUrl = () => {
  const inviteParam = route.query.invite as string;
  if (inviteParam) {
    try {
      // 如果是邀请码，解析成地址；如果已经是地址，直接使用
      let inviterAddress = '';
      if (inviteParam.startsWith('0x') && inviteParam.length === 42) {
        // 已经是地址格式
        inviterAddress = inviteParam;
      } else {
        // 是邀请码，需要解析
        inviterAddress = parseInviteCode(inviteParam);
      }
      
      inviteAddress.value = inviterAddress;
      console.log('Detected invite from URL:', inviterAddress);
      
      return true;
    } catch (error) {
      console.error('Invalid invite parameter:', inviteParam, error);
      toast.error('邀请链接无效');
      return false;
    }
  }
  return false;
};

// 处理邀请绑定逻辑
const handleInviteBinding = () => {
  // 如果没有连接钱包，提示连接
  if (!isConnected.value) {
    toast.info('请先连接钱包以接受邀请');
    return;
  }
  
  // 如果已经绑定了推荐人，不需要处理
  if (isReferrerBound.value) {
    toast.info('您已经绑定了推荐人');
    // 清除URL中的invite参数
    if (route.query.invite) {
      router.replace({ path: '/profile' });
    }
    return;
  }
  
  // 如果有邀请地址，自动弹出绑定框
  if (inviteAddress.value) {
    showBindReferrerModal.value = true;
    toast.success(`检测到邀请，邀请人：${formatAddress(inviteAddress.value)}`);
  }
};

// 判断是否已绑定推荐人
const isReferrerBound = computed(() => {
  if (!userInfo.value) return false;
  
  const info = userInfo.value as any[];
  const referrer = info[0] as string;
  
  return referrer && 
         referrer !== '0x0000000000000000000000000000000000000000' &&
         referrer !== '0x0';
});

// 监听钱包连接状态和用户信息变化
watch([isConnected, userInfo], () => {
  if (inviteAddress.value) {
    handleInviteBinding();
  }
}, { immediate: false });

// 组件挂载时检测邀请参数
onMounted(() => {
  if (checkInviteFromUrl()) {
    handleInviteBinding();
  }
});

// Modal 控制逻辑（保留用于其他用途）

// Modal 控制逻辑（保留用于其他用途）
const isModalVisible = ref(false);
const modalTitle = ref('');
const modalContent = ref('');

// 使用通用内容页面显示详细信息
const showInfo = (type: 'aboutUs' | 'contactUs') => {
  const contentMap = {
    aboutUs: {
      title: t('profilePage.aboutUs'),
      type: 'markdown',
      content: t('aboutUs.content')
    },
    contactUs: {
      title: t('profilePage.contactUs'),
      type: 'markdown',
      content: t('contactUs.content')
    }
  };

  const data = contentMap[type];
  router.push({
    path: '/content',
    query: {
      title: data.title,
      type: data.type,
      content: data.content
    }
  });
};

</script>