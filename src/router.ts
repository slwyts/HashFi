import { createRouter, createWebHistory } from 'vue-router';

// Lazy load components for better performance
const Staking = () => import('./views/Staking.vue');
const StakingOrderDetail = () => import('./views/StakingOrderDetail.vue');
const Swap = () => import('./views/Swap.vue');
const Income = () => import('./views/Income.vue');
const Team = () => import('./views/Team.vue');
const Profile = () => import('./views/Profile.vue');
const GenesisNode = () => import('./views/GenesisNode.vue');
const Admin = () => import('./views/Admin.vue');
const ContentView = () => import('./views/ContentView.vue'); // 新增通用内容页面
const ContentTest = () => import('./views/ContentTest.vue'); // 测试页面（可选）

const routes = [
  { path: '/', redirect: '/swap' },
  { path: '/staking', component: Staking },
  { path: '/staking/order/:id', component: StakingOrderDetail },
  { path: '/swap', component: Swap },
  { path: '/income', component: Income },
  { path: '/team', component: Team },
  { path: '/profile', component: Profile },
  { path: '/genesis-node', component: GenesisNode },
  { path: '/admin', component: Admin },
  { path: '/content/:data?', name: 'content', component: ContentView }, // 通用内容页面
  { path: '/content-test', component: ContentTest }, // 测试页面（可选，用于开发测试）
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;