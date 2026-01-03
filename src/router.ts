import { createRouter, createWebHistory } from 'vue-router';

const Staking = () => import('./views/Staking.vue');
const StakingOrderDetail = () => import('./views/StakingOrderDetail.vue');
// const Swap = () => import('./views/Swap.vue');
const Income = () => import('./views/Income.vue');
const Team = () => import('./views/Team.vue');
const Profile = () => import('./views/Profile.vue');
const GenesisNode = () => import('./views/GenesisNode.vue');
const HashPower = () => import('./views/HashPower.vue');
const Admin = () => import('./views/Admin.vue');
const ContentView = () => import('./views/ContentView.vue');

const routes = [
  { path: '/', redirect: '/staking' },
  { path: '/staking', component: Staking },
  { path: '/staking/order/:id', component: StakingOrderDetail },
  // { path: '/swap', component: Swap },
  { path: '/income', component: Income },
  { path: '/team', component: Team },
  { path: '/profile', component: Profile },
  { path: '/genesis-node', component: GenesisNode },
  { path: '/hashpower', component: HashPower },
  { path: '/admin', component: Admin },
  { path: '/content/:data?', name: 'content', component: ContentView },
  {
    path: '/invite/:code',
    redirect: (to: any) => {
      const inviteCode = to.params.code as string;
      console.log('Processing invite code:', inviteCode);
      return `/profile?invite=${inviteCode}`;
    }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;