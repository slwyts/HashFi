<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen p-4">
    <!-- 邀请卡片 - 现代化渐变设计 -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl mb-6 overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10">
        <div class="flex items-center mb-3">
          <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-lg">{{ t('teamPage.inviteTitle') }}</h3>
        </div>
        <div class="bg-white/15 backdrop-blur-sm p-4 rounded-xl flex justify-between items-center">
          <span class="text-sm font-mono truncate mr-4 opacity-90">{{ inviteLink || '请连接钱包' }}</span>
          <button 
            @click="copyInviteLink"
            :disabled="!address"
            class="bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors flex-shrink-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ t('teamPage.copy') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.totalMembers') }}</p>
        <p class="text-3xl font-bold text-gray-800">{{ totalMembers }}</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.directReferrals') }}</p>
        <p class="text-3xl font-bold text-gray-800">{{ directReferralsCount }}</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow col-span-2 border border-gray-100">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mb-1">{{ t('teamPage.totalPerformance') }} (USDT)</p>
        <p class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{{ teamTotalPerformance }}</p>
        <div class="text-xs text-gray-400 mt-2 space-y-1">
          <p>大区业绩: {{ largestAreaPerformance }} USDT</p>
          <p>小区业绩: {{ smallAreaPerformance }} USDT</p>
          <p>个人投资: {{ personalStakedAmount }} USDT</p>
        </div>
      </div>
    </div>
    
    <!-- 团队等级卡片 -->
    <div class="bg-white p-6 rounded-2xl shadow-md mb-6 border border-gray-100">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg text-gray-800">{{ t('teamPage.teamLevel') }}</h3>
        <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-md">{{ teamLevel.current }}</span>
      </div>
      <div class="flex justify-between text-sm mb-3 text-gray-600">
        <p>小区业绩: <span class="font-semibold text-gray-800">{{ teamLevel.currentPerformance }} USDT</span></p>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-inner" :style="{ width: teamLevel.progress + '%' }"></div>
      </div>
      <div class="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
        <span v-if="teamLevel.remainingToNext > 0">
          距离 {{ teamLevel.next }} 级别还差: {{ teamLevel.remainingToNext.toFixed(2) }} USDT
        </span>
        <span v-else class="text-green-600">
          🎉 已达到当前等级要求！
        </span>
      </div>
    </div>

    <!-- 团队成员列表 -->
    <div>
      <h3 class="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{{ t('teamPage.myTeam') }}</h3>
      <div class="bg-white p-5 rounded-2xl shadow-md border border-gray-100">
        <div v-if="teamMembers.length > 0" class="space-y-4">
          <div v-for="member in teamMembers" :key="member.address" class="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white mr-4 shadow-md">
              {{ member.address.substring(2, 4).toUpperCase() }}
            </div>
            <div class="flex-grow">
              <p class="font-semibold text-gray-800">{{ member.shortAddress }}</p>
              <p class="text-xs text-gray-500 mt-1">
                个人投资: {{ member.personalStaked }} USDT | 团队业绩: {{ member.teamPerformance }} USDT
              </p>
            </div>
            <div class="text-right">
              <span class="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-1">{{ member.level }}</span>
              <p class="text-sm font-semibold text-gray-600">总计: {{ member.totalPerformance }} USDT</p>
            </div>
          </div>
        </div>
         <div v-else class="text-center py-12">
          <img src="/icons/no_data.png" alt="No data" class="mx-auto w-24 h-24 opacity-50" />
          <p class="text-gray-400 mt-3">{{ t('stakingPage.noData') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount, useReadContract } from '@wagmi/vue';
import { formatUnits } from 'viem';
import { abi } from '@/core/contract';
import { useToast } from '@/composables/useToast';

// 团队成员类型定义
interface TeamMember {
  address: string;
  level: string;
  personalStaked: string;
  teamPerformance: string;
  totalPerformance: string;
  shortAddress: string;
}

const { t } = useI18n();
const { address } = useAccount();
const toast = useToast();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

// ========== 1. 获取用户数据 ==========
const userArgs = computed(() => address.value ? [address.value] as const : undefined);

const { data: userData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// ========== 2. 获取团队业绩详情 ==========
const { data: teamPerformanceData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getTeamPerformanceDetails',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// ========== 2.1 获取直推成员详细信息 ==========
const { data: directReferralsData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getDirectReferrals',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// ========== 3. 团队数据计算 ==========
// 用户等级 (V0-V5)
const userLevel = computed(() => {
  if (!userData.value) return 0;
  return Number((userData.value as any)[1]); // teamLevel
});

// 直推人数（使用团队成员数据或者合约返回值）
const directReferralsCount = computed(() => {
  try {
    // 优先使用 directReferralsData，如果没有则使用 teamPerformanceData
    if (directReferralsData.value && Array.isArray(directReferralsData.value)) {
      return (directReferralsData.value as any[]).length;
    }
    if (teamPerformanceData.value) {
      const count = (teamPerformanceData.value as any)[3]; // directReferralsCount
      return Number(count) || 0;
    }
    return 0;
  } catch (error) {
    console.error('计算直推人数时出错:', error);
    return 0;
  }
});

// 团队总人数 = 直推人数 (简化显示)
const totalMembers = computed(() => directReferralsCount.value);

// 团队总业绩 (所有直推的业绩总和)
const teamTotalPerformance = computed(() => {
  try {
    if (!teamPerformanceData.value) return '0.00';
    const totalPerformance = (teamPerformanceData.value as any)[0]; // totalPerformance from contract
    const largestArea = (teamPerformanceData.value as any)[1]; // largestArea
    const smallArea = (teamPerformanceData.value as any)[2]; // smallArea
    
    // 安全检查
    if (typeof largestArea !== 'bigint' || typeof smallArea !== 'bigint') {
      console.warn('团队业绩数据类型错误:', teamPerformanceData.value);
      return '0.00';
    }
    
    // 总业绩 = 大区 + 小区
    const total = largestArea + smallArea;
    return parseFloat(formatUnits(total, 18)).toFixed(2);
  } catch (error) {
    console.error('计算团队总业绩时出错:', error);
    return '0.00';
  }
});

// 小区业绩 (用于等级判断)
const smallAreaPerformance = computed(() => {
  try {
    if (!teamPerformanceData.value) return '0.00';
    const smallArea = (teamPerformanceData.value as any)[2]; // smallArea
    
    if (typeof smallArea !== 'bigint') {
      console.warn('小区业绩数据类型错误:', smallArea);
      return '0.00';
    }
    
    return parseFloat(formatUnits(smallArea, 18)).toFixed(2);
  } catch (error) {
    console.error('计算小区业绩时出错:', error);
    return '0.00';
  }
});

// 大区业绩
const largestAreaPerformance = computed(() => {
  try {
    if (!teamPerformanceData.value) return '0.00';
    const largestArea = (teamPerformanceData.value as any)[1]; // largestArea
    
    if (typeof largestArea !== 'bigint') {
      console.warn('大区业绩数据类型错误:', largestArea);
      return '0.00';
    }
    
    return parseFloat(formatUnits(largestArea, 18)).toFixed(2);
  } catch (error) {
    console.error('计算大区业绩时出错:', error);
    return '0.00';
  }
});

// 个人总投资额
const personalStakedAmount = computed(() => {
  try {
    if (!userData.value) return '0.00';
    const totalStaked = (userData.value as any)[2];
    
    if (typeof totalStaked !== 'bigint') {
      console.warn('个人投资数据类型错误:', totalStaked);
      return '0.00';
    }
    
    return parseFloat(formatUnits(totalStaked, 18)).toFixed(2);
  } catch (error) {
    console.error('计算个人投资时出错:', error);
    return '0.00';
  }
});

const levelNames = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'];

const currentLevelName = computed(() => {
  const level = userLevel.value;
  return levelNames[level] || '青铜';
});

const nextLevelName = computed(() => {
  const level = userLevel.value;
  return levelNames[level + 1] || 'V5+';
});

// ========== 4. 获取直推列表（备用，主要使用 directReferralsData）==========
const directReferrals = computed(() => {
  if (!userData.value) return [];
  const referrals = (userData.value as any)[4]; // 索引4是directReferrals
  return Array.isArray(referrals) ? referrals : [];
});

// ========== 5. 获取团队成员详细信息（从链上查询真实数据）==========
const teamMembers = computed<TeamMember[]>(() => {
  try {
    if (!directReferralsData.value) {
      console.log('无直推成员数据，directReferralsData.value:', directReferralsData.value);
      return [];
    }
    
    const members = directReferralsData.value as any[];
    console.log('团队成员详细数据:', members); // 调试信息
    
    if (!Array.isArray(members) || members.length === 0) {
      console.log('团队成员数组为空或不是数组');
      return [];
    }
  
  return members.map((member: any): TeamMember | null => {
    try {
      console.log('处理团队成员:', member); // 调试每个成员的数据
      
      // 检查 member 是否是对象还是数组
      let address, teamLevel, totalStaked, teamPerformance;
      
      if (Array.isArray(member)) {
        // 如果是数组格式：[memberAddress, teamLevel, totalStakedAmount, teamTotalPerformance]
        address = member[0] as string;
        teamLevel = Number(member[1]) || 0;
        totalStaked = member[2];
        teamPerformance = member[3];
      } else if (typeof member === 'object' && member !== null) {
        // 如果是对象格式：{memberAddress, teamLevel, totalStakedAmount, teamTotalPerformance}
        address = member.memberAddress || member[0];
        teamLevel = Number(member.teamLevel || member[1]) || 0;
        totalStaked = member.totalStakedAmount || member[2];
        teamPerformance = member.teamTotalPerformance || member[3];
      } else {
        console.warn('团队成员数据格式不正确:', member);
        return null;
      }
      
      // 类型转换：确保数值是 bigint
      let totalStakedBigInt = 0n;
      let teamPerformanceBigInt = 0n;
      
      try {
        totalStakedBigInt = typeof totalStaked === 'bigint' ? totalStaked : BigInt(totalStaked || 0);
        teamPerformanceBigInt = typeof teamPerformance === 'bigint' ? teamPerformance : BigInt(teamPerformance || 0);
      } catch (convertError) {
        console.warn('转换 bigint 失败:', { totalStaked, teamPerformance, convertError });
        totalStakedBigInt = 0n;
        teamPerformanceBigInt = 0n;
      }
      
      // 计算成员的总业绩
      const totalPerformanceBigInt = totalStakedBigInt + teamPerformanceBigInt;
      
      return {
        address: address || '未知地址',
        level: `V${teamLevel}`,
        personalStaked: parseFloat(formatUnits(totalStakedBigInt, 18)).toFixed(2),
        teamPerformance: parseFloat(formatUnits(teamPerformanceBigInt, 18)).toFixed(2),
        totalPerformance: parseFloat(formatUnits(totalPerformanceBigInt, 18)).toFixed(2),
        shortAddress: address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '未知'
      } as TeamMember;
    } catch (error) {
      console.error('处理团队成员数据时出错:', error, member);
      return {
        address: '错误',
        level: 'V0',
        personalStaked: '0.00',
        teamPerformance: '0.00',
        totalPerformance: '0.00',
        shortAddress: '错误'
      } as TeamMember;
    }
  }).filter((member): member is TeamMember => member !== null); // 类型守卫过滤
  } catch (error) {
    console.error('获取团队成员详细信息时出错:', error);
    return [];
  }
});

// ========== 6. 等级进度 ==========
// 基于小区业绩计算等级进度（符合文档要求）
const teamLevel = computed(() => {
  const level = userLevel.value;
  const performance = parseFloat(smallAreaPerformance.value); // 使用小区业绩
  
  // V1-V5等级目标（小区业绩）
  const targets = [0, 5000, 20000, 100000, 300000, 1000000]; // V0, V1, V2, V3, V4, V5
  const currentTarget = targets[level] || 0;
  const nextTarget = targets[level + 1] || 1000000;
  
  let progress = 0;
  let remainingToNext = 0;
  
  if (level >= targets.length - 1) {
    // 已达到最高等级 V5
    progress = 100;
    remainingToNext = 0;
  } else {
    // 计算到下一等级还需要的业绩
    remainingToNext = Math.max(0, nextTarget - performance);
    if (nextTarget > currentTarget) {
      progress = ((performance - currentTarget) / (nextTarget - currentTarget)) * 100;
      progress = Math.min(Math.max(progress, 0), 100);
    }
  }
  
  return {
    current: levelNames[level] || 'V0',
    next: levelNames[level + 1] || 'V5+',
    progress: Number(progress.toFixed(1)),
    currentPerformance: performance,
    remainingToNext: remainingToNext
  };
});

// ========== 动态邀请链接生成 ==========
const inviteLink = computed(() => {
  if (!address.value) return '';
  
  // 获取当前页面的协议、域名和端口
  const { protocol, host } = window.location;
  return `${protocol}//${host}/invite/${address.value}`;
});

// ========== 6. 复制邀请链接 ==========
const copyInviteLink = () => {
  if (!address.value) return;
  
  navigator.clipboard.writeText(inviteLink.value).then(() => {
    toast.success(t('common.copySuccess'));
  }).catch(() => {
    toast.error(t('common.copyFailed'));
  });
};
</script>