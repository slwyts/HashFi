import { reactive } from 'vue';

// 模拟的当前质押订单数据 (与Staking.vue中的保持一致)
const currentStakes = reactive([
  {
    id: 1,
    plan: 'stakingPage.gold',
    amount: 1000,
    status: '进行中',
    totalQuota: 2500,
    released: 125.5,
    releasedHAF: 83.67,
    time: '2025-01-15 10:30'
  },
  {
    id: 2,
    plan: 'stakingPage.bronze',
    amount: 300,
    status: '已结束',
    totalQuota: 450,
    released: 450,
    releasedHAF: 250.12,
    time: '2024-11-20 14:00'
  },
]);

// 导出一个函数，用于根据ID查找订单
export const findOrderById = (id: number) => {
  return currentStakes.find(order => order.id === id);
};

// 导出整个列表，Staking.vue也会用到
export const stakes = currentStakes;