import { createRouter, createWebHistory } from 'vue-router';

// 为了演示，我们先创建一些占位符组件
const Staking = { template: '<div>质押页面</div>' };
const Swap = () => import('./views/Swap.vue');
const Income = { template: '<div>投资收益页面</div>' };
const Team = { template: '<div>团队页面</div>' };
const Profile = { template: '<div>我的页面</div>' };

const routes = [
  { path: '/', redirect: '/swap' },
  { path: '/staking', component: Staking },
  { path: '/swap', component: Swap },
  { path: '/income', component: Income },
  { path: '/team', component: Team },
  { path: '/profile', component: Profile },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;