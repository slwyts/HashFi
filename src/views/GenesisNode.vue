<template>
  <div class="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-20">
    <!-- Header -->
    <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 flex items-center shadow-xl rounded-b-3xl overflow-hidden">
      <!-- 装饰性背景圆圈 -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      
      <div class="relative z-10 flex items-center w-full">
        <button @click="router.back()" class="mr-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-xl font-bold text-white">创世节点中心</h2>
      </div>
    </div>

    <!-- 申请页面 -->
    <div v-if="!userIsNode && !isPendingApproval" class="p-4 space-y-6">
      <!-- 节点费用信息 -->
      <div class="card p-6 relative overflow-hidden">
        <!-- 装饰性背景 -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h3 class="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">成为创世节点</h3>
          <p class="text-gray-600 mb-6">享受平台全球分红权益，共建生态未来</p>
        </div>
        
        <!-- 费用信息 -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div class="text-center">
            <p class="text-sm text-gray-600 mb-2">申请费用</p>
            <p class="text-4xl font-bold text-blue-600 mb-2">{{ nodeCostDisplay }} USDT</p>
            <p class="text-sm text-gray-500">您的余额: {{ usdtBalanceDisplay }} USDT</p>
          </div>
        </div>

        <!-- 节点权益 -->
        <div class="space-y-6 mb-8">
          <h4 class="text-xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">节点权益</h4>
          
          <!-- 权益1：矿机赠送 -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div class="flex-1">
                <h5 class="font-bold text-lg text-gray-800 mb-3">赠送11888美金大算力矿机</h5>
                <div class="space-y-2 text-sm text-gray-700">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <span><strong>矿机型号：</strong>阿瓦隆天花板水冷1566HA—算力500T</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <span><strong>矿机价值：</strong>7000美金</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    <span><strong>电费运维：</strong>赠送一年电费及运维费用（价值4300美金）</span>
                  </div>
                  <div class="bg-blue-100 rounded-lg p-3 mt-3">
                    <p class="font-semibold text-blue-800">实物矿机，总价值 11888 美金</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 权益2：全球分红 -->
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="flex-1">
                <h5 class="font-bold text-lg text-gray-800 mb-3">享受全球总业绩静态10%加权分红</h5>
                <div class="space-y-2 text-sm text-gray-700">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>参与全平台用户静态收益的10%分红</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>按照节点权重进行分红分配</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>每日自动结算，实时到账</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 权益3：市场扶持 -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h5 class="font-bold text-lg text-gray-800 mb-3">市场扶持政策</h5>
                <div class="space-y-2 text-sm text-gray-700">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    <span><strong>工作室补贴：</strong>推广工作室资源支持</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    <span><strong>讲师补贴：</strong>专业培训讲师资源</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    <span><strong>酒会沙龙补贴：</strong>高端商务活动支持</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 权益4：生态治理 -->
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="flex-1">
                <h5 class="font-bold text-lg text-gray-800 mb-3">Hash Fi 基金会生态治理权</h5>
                <div class="space-y-2 text-sm text-gray-700">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    <span>参与平台重大决策投票权</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    <span>共建去中心化生态发展</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    <span>享有平台未来发展方向话语权</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 申请按钮 -->
        <button 
          @click="handleApply"
          :disabled="!canApply || isProcessing"
          class="w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          :class="{
            'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white': canApply && !isProcessing,
            'bg-gray-300 text-gray-500 cursor-not-allowed': !canApply || isProcessing
          }"
        >
          {{ buttonText }}
        </button>
      </div>
    </div>

    <!-- 待审核页面 -->
    <div v-else-if="isPendingApproval" class="p-4">
      <div class="card p-6 text-center relative overflow-hidden">
        <!-- 装饰性背景 -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div class="relative z-10">
          <div class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">申请已提交</h3>
          <p class="text-gray-600 mb-6">您的创世节点申请正在审核中，请耐心等待</p>
          
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-blue-800 mb-2">审核说明</h4>
            <ul class="text-sm text-blue-700 text-left space-y-1">
              <li>• 审核周期通常为1-3个工作日</li>
              <li>• 审核通过后您将成为正式创世节点</li>
              <li>• 审核未通过将全额退还申请费用</li>
            </ul>
          </div>

          <button 
            @click="router.back()"
            class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            返回
          </button>
        </div>
      </div>
    </div>

    <!-- 创世节点控制台 -->
    <div v-else class="p-4 space-y-6">
      <!-- 节点状态卡片 -->
      <div class="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl p-6 text-white overflow-hidden">
        <!-- 装饰性背景圆圈 -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div class="relative z-10 flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mr-3 shadow-lg">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">创世节点</h3>
              <p class="text-blue-100 opacity-90">Genesis Node</p>
            </div>
          </div>
          <div class="text-right">
            <div 
              :class="[
                'px-3 py-1 rounded-full text-sm font-bold',
                isStillActiveNode 
                  ? 'bg-white/20 text-white backdrop-blur-sm' 
                  : 'bg-white/10 text-white/70 backdrop-blur-sm'
              ]"
            >
              {{ isStillActiveNode ? t('genesisNode.active') : t('genesisNode.exited') }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分红统计 -->
      <div class="card p-6">
        <h3 class="text-lg font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">我的分红统计</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border border-green-100">
            <p class="text-2xl font-bold text-green-600">{{ claimableGenesisRewards }}</p>
            <p class="text-sm text-gray-600">可提取(USDT)</p>
          </div>
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
            <p class="text-2xl font-bold text-blue-600">{{ withdrawnDividends }}</p>
            <p class="text-sm text-gray-600">已提取(USDT)</p>
          </div>
        </div>

        <!-- 退出进度 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">退出进度</span>
            <span class="text-sm text-blue-600 font-semibold">{{ exitProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div 
              class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: exitProgress + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 USDT</span>
            <span>{{ maxWithdrawAmount }} USDT (3x)</span>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            <span v-if="!hasReachedExitCondition">
              {{ t('genesisNode.exitConditionDescription', { amount: maxWithdrawAmount }) }}
            </span>
            <span v-else class="text-blue-600 font-medium">
              ✅ {{ t('genesisNode.exitConditionMet') }}
            </span>
          </p>
        </div>

        <!-- 提取按钮 -->
        <button 
          v-if="parseFloat(claimableGenesisRewards) > 0"
          @click="handleWithdraw"
          :disabled="isProcessing"
          class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:transform-none"
        >
          {{ isProcessing ? '提取中...' : `提取 ${claimableGenesisRewards} USDT` }}
        </button>
      </div>

      <!-- 全网数据 -->
      <div class="card p-6">
        <h3 class="text-lg font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">全网节点数据</h3>
        
        <div class="grid grid-cols-1 gap-4">
          <div class="flex justify-between items-center py-3 border-b border-blue-100">
            <span class="text-gray-600">活跃节点数量</span>
            <span class="font-bold text-blue-600">{{ activeNodesCount }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-blue-100">
            <span class="text-gray-600">全球分红池</span>
            <span class="font-bold text-green-600">{{ totalDividendsDisplay }} USDT</span>
          </div>
          <div class="flex justify-between items-center py-3">
            <span class="text-gray-600">平均每节点分红</span>
            <span class="font-bold text-indigo-600">{{ averageDividendDisplay }} USDT</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccount, useReadContract, useBalance } from '@wagmi/vue';
import { formatUnits } from 'viem';
import { useI18n } from 'vue-i18n';
import { abi } from '@/core/contract';
import { useEnhancedContract } from '@/composables/useEnhancedContract';
import { toast } from '@/composables/useToast';

const router = useRouter();
const { address, isConnected } = useAccount();
const { t } = useI18n();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS as `0x${string}`;

const isProcessing = ref(false);

// ========== 1. 获取创世节点费用 ==========
const { data: genesisNodeCost } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'genesisNodeCost',
});

const nodeCostDisplay = computed(() => {
  if (!genesisNodeCost.value) return '5000';
  return parseFloat(formatUnits(genesisNodeCost.value as bigint, 18)).toFixed(0);
});

// ========== 2. 获取用户信息 ==========
const userArgs = computed(() => address.value ? [address.value] as const : undefined);

const { data: userData, refetch: refetchUser } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'users',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

// 用户是否是创世节点
const userIsNode = computed(() => {
  if (!userData.value) return false;
  const userArray = userData.value as any[];
  return userArray[4]; // isGenesisNode 是第5个元素（索引4）
});

// ========== 3. 获取申请状态 ==========
const { data: applicationPending } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'genesisNodeApplications',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

const isPendingApproval = computed(() => !!applicationPending.value);

// ========== 4. 获取可提取的创世分红 ==========
const { data: claimableRewards } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getClaimableRewards',
  args: userArgs,
  query: {
    enabled: !!address.value && userIsNode.value,
  }
});

const claimableGenesisRewards = computed(() => {
  if (!claimableRewards.value || !userIsNode.value) return '0.00';
  const rewards = claimableRewards.value as [bigint, bigint, bigint];
  const genesisReward = rewards[2]; // 第三个是创世节点分红
  return parseFloat(formatUnits(genesisReward, 18)).toFixed(2);
});

// ========== 5. 已提取分红 ==========
const withdrawnDividends = computed(() => {
  if (!userData.value) return '0.00';
  const userArray = userData.value as any[];
  const withdrawn = userArray[5]; // genesisDividendsWithdrawn 是第6个元素（索引5）
  if (!withdrawn) return '0.00';
  return parseFloat(formatUnits(withdrawn as bigint, 18)).toFixed(2);
});

// ========== 6. 退出进度计算 ==========
const maxWithdrawAmount = computed(() => {
  return (parseFloat(nodeCostDisplay.value) * 3).toFixed(0);
});

const exitProgress = computed(() => {
  const withdrawn = parseFloat(withdrawnDividends.value);
  const max = parseFloat(maxWithdrawAmount.value);
  return max > 0 ? Math.min((withdrawn / max) * 100, 100).toFixed(1) : '0';
});

// ========== 检查是否已达到退出条件 ==========
const hasReachedExitCondition = computed(() => {
  return parseFloat(exitProgress.value) >= 100;
});

const isStillActiveNode = computed(() => {
  if (!activeGenesisNodes.value || !address.value) return false;
  const activeNodes = activeGenesisNodes.value as string[];
  return activeNodes.some(node => node.toLowerCase() === address.value!.toLowerCase());
});

// ========== 7. 获取 USDT 余额 ==========
const { data: usdtBalance } = useBalance({
  address: address,
  token: USDT_ADDRESS,
  query: {
    enabled: !!address.value,
  }
});

const usdtBalanceDisplay = computed(() => {
  if (!usdtBalance.value) return '0.00';
  return parseFloat(formatUnits(usdtBalance.value.value, 18)).toFixed(2);
});

// ========== 8. 获取全网节点数据 ==========
const { data: activeGenesisNodes } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getActiveGenesisNodes',
});

const activeNodesCount = computed(() => {
  if (!activeGenesisNodes.value) return '0';
  return (activeGenesisNodes.value as string[]).length.toString();
});

const { data: globalGenesisPool } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'globalGenesisPool',
});

const totalDividendsDisplay = computed(() => {
  if (!globalGenesisPool.value) return '0.00';
  return parseFloat(formatUnits(globalGenesisPool.value as bigint, 18)).toFixed(2);
});

const averageDividendDisplay = computed(() => {
  const total = parseFloat(totalDividendsDisplay.value);
  const count = parseInt(activeNodesCount.value);
  if (count === 0) return '0.00';
  return (total / count).toFixed(2);
});

// ========== 9. 检查用户是否已质押 ==========
const { data: userOrders } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi,
  functionName: 'getUserOrders',
  args: userArgs,
  query: {
    enabled: !!address.value,
  }
});

const hasStaked = computed(() => {
  if (!userData.value) return false;
  
  // userData.value 是一个数组，按照ABI顺序：
  // [referrer, teamLevel, totalStakedAmount, teamTotalPerformance, isGenesisNode, ...]
  const userArray = userData.value as any[];
  const totalStaked = userArray[2]; // totalStakedAmount 是第3个元素（索引2）
  
  return totalStaked && totalStaked > 0n;
});

// ========== 10. 按钮状态和处理 ==========
const canApply = computed(() => {
  if (!address.value || !isConnected.value) return false;
  if (!hasStaked.value) return false;
  if (userIsNode.value || isPendingApproval.value) return false;
  if (parseFloat(usdtBalanceDisplay.value) < parseFloat(nodeCostDisplay.value)) return false;
  return true;
});

const buttonText = computed(() => {
  if (!address.value || !isConnected.value) return t('common.connectWallet');
  if (!hasStaked.value) return t('genesisNode.pleaseStakeFirst');
  if (userIsNode.value) return t('genesisNode.alreadyGenesisNode');
  if (isPendingApproval.value) return t('genesisNode.applicationPending');
  if (parseFloat(usdtBalanceDisplay.value) < parseFloat(nodeCostDisplay.value)) {
    return t('genesisNode.insufficientUsdt');
  }
  if (isProcessing.value) return t('genesisNode.applying');
  return t('genesisNode.applyNow');
});

// ========== 11. 申请处理 ==========
const { callContractWithRefresh } = useEnhancedContract();

const handleApply = async () => {
  if (!canApply.value) return;
  
  isProcessing.value = true;
  
  try {
    await callContractWithRefresh({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'applyForGenesisNode',
      args: [],
      pendingMessage: '申请创世节点中...',
      successMessage: '创世节点申请已提交，等待审核！',
      operation: 'Apply for Genesis Node',
      onConfirmed: () => {
        refetchUser();
      }
    }, {});
    
  } catch (error: any) {
    console.error('Apply genesis node error:', error);
    
    // 处理常见错误
    let errorMessage = '申请失败';
    if (error.message?.includes('User must stake first')) {
      errorMessage = '请先进行质押';
    } else if (error.message?.includes('Already a genesis node')) {
      errorMessage = '您已经是创世节点了';
    } else if (error.message?.includes('Application already pending')) {
      errorMessage = '申请已提交，请等待审核';
    } else if (error.message?.includes('insufficient allowance')) {
      errorMessage = '请先授权USDT';
    }
    
    toast.error(errorMessage);
  } finally {
    isProcessing.value = false;
  }
};

// ========== 12. 提取分红 ==========
const handleWithdraw = async () => {
  if (!address.value || parseFloat(claimableGenesisRewards.value) === 0) return;
  
  isProcessing.value = true;
  
  try {
    await callContractWithRefresh({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'withdraw',
      args: [],
      pendingMessage: '提取分红中...',
      successMessage: `成功提取 ${claimableGenesisRewards.value} USDT 分红！`,
      operation: 'Withdraw Genesis Rewards',
      onConfirmed: () => {
        refetchUser();
      }
    }, {});
    
  } catch (error: any) {
    console.error('Withdraw error:', error);
    toast.error('提取失败: ' + (error.message || '未知错误'));
  } finally {
    isProcessing.value = false;
  }
};

// ========== 组件挂载时的处理 ==========
onMounted(() => {
  console.log('GenesisNode component mounted');
});
</script>

<style scoped>
/* 自定义样式 */
.gradient-border {
  background: linear-gradient(45deg, #8B5CF6, #06B6D4);
  padding: 2px;
  border-radius: 12px;
}

.gradient-border > div {
  background: white;
  border-radius: 10px;
}
</style>