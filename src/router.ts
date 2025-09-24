import { createRouter, createWebHistory } from 'vue-router';

// Lazy load components for better performance
const Staking = () => import('./views/Staking.vue');
const StakingOrderDetail = () => import('./views/StakingOrderDetail.vue');
const Swap = () => import('./views/Swap.vue');
const Income = () => import('./views/Income.vue');
const Team = () => import('./views/Team.vue');
const Profile = () => import('./views/Profile.vue');
const GenesisNode = () => import('./views/GenesisNode.vue'); // 新增

const routes = [
  { path: '/', redirect: '/swap' },
  { path: '/staking', component: Staking },
  { path: '/staking/order/:id', component: StakingOrderDetail },
  { path: '/swap', component: Swap },
  { path: '/income', component: Income },
  { path: '/team', component: Team },
  { path: '/profile', component: Profile },
  { path: '/genesis-node', component: GenesisNode }, // 新增
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;