# HashFi 推荐人绑定逻辑详解

## 📋 目录
1. [核心概念](#核心概念)
2. [智能合约逻辑](#智能合约逻辑)
3. [前端实现](#前端实现)
4. [完整流程](#完整流程)
5. [常见问题](#常见问题)
6. [改进建议](#改进建议)

---

## 核心概念

### 什么是推荐人？
推荐人是邀请你加入 HashFi 平台的用户。在区块链 DeFi 项目中，推荐人机制用于：
- 🎯 **拓展用户** - 通过现有用户邀请新用户
- 💰 **激励推广** - 推荐人可获得推荐奖励
- 🔒 **防止刷单** - 必须有真实用户推荐才能参与

### 为什么必须绑定推荐人？
```solidity
// 合约中的限制
function stake(uint256 _amount) external {
    require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
    // ...
}
```

**原因：**
1. **防止机器人刷单** - 需要真实用户邀请
2. **确保推荐奖励正确** - 推荐人获得收益
3. **构建社区网络** - 形成用户推荐关系网

---

## 智能合约逻辑

### 1. 用户数据结构
```solidity
struct User {
    address referrer;              // 推荐人地址
    address[] directReferrals;     // 直推用户列表
    uint256 totalStakedAmount;     // 总质押金额
    // ... 其他字段
}

mapping(address => User) public users;
```

### 2. 绑定推荐人函数
```solidity
function bindReferrer(address _referrer) external whenNotPaused {
    User storage user = users[msg.sender];
    
    // ✅ 验证1: 只能绑定一次
    require(user.referrer == address(0), "Referrer already bound");
    
    // ✅ 验证2: 推荐人必须是已经质押过的用户
    require(users[_referrer].totalStakedAmount > 0, "Referrer does not exist");
    
    // ✅ 验证3: 不能推荐自己
    require(_referrer != msg.sender, "Cannot refer yourself");
    
    // 绑定推荐人
    user.referrer = _referrer;
    users[_referrer].directReferrals.push(msg.sender);
    
    emit ReferrerBound(msg.sender, _referrer);
}
```

### 3. 质押函数的推荐人检查
```solidity
function stake(uint256 _amount) external nonReentrant whenNotPaused autoUpdatePrice {
    // ❌ 第一步就检查：必须先绑定推荐人
    require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
    
    // ... 质押逻辑
}
```

### 4. 推荐奖励计算
```solidity
// 直推奖励 - 推荐人获得直接推荐用户收益的一定比例
function _settleDirectReward(address _user) internal {
    User storage user = users[_user];
    if (user.referrer != address(0)) {
        // 给推荐人发放奖励
        // ...
    }
}
```

---

## 前端实现

### 1. 当前实现（Profile.vue）

#### 显示推荐人状态
```vue
<template>
  <li class="p-4 flex justify-between items-center">
    <span>绑定推荐人</span>
    <span>{{ referrerDisplay }}</span>  <!-- 显示推荐人地址或"未绑定" -->
  </li>
</template>

<script setup lang="ts">
const referrerDisplay = computed(() => {
  if (!userInfo.value) return '未绑定';
  
  const referrer = userInfo.value.referrer;
  
  // 检查是否为零地址
  if (!referrer || referrer === '0x0000000000000000000000000000000000000000') {
    return '未绑定';
  }
  
  // 显示简化地址：0x1234...5678
  return `${referrer.substring(0, 6)}...${referrer.substring(referrer.length - 4)}`;
});
</script>
```

#### ❌ 问题：**没有绑定功能！**
- 只显示状态
- 无法点击绑定
- 无输入框
- 无绑定按钮

### 2. 认购流程检查（Staking.vue）

```typescript
const handleStake = async () => {
  // 0. 检查是否绑定推荐人
  const referrer = userInfo.value?.referrer || '0x0000000000000000000000000000000000000000';
  
  if (referrer === '0x0000000000000000000000000000000000000000') {
    // ⚠️ 未绑定推荐人
    toast.warning('请先绑定推荐人才能认购');
    router.push('/profile');  // 跳转到个人页面
    return;
  }
  
  // 1. 授权 USDT
  // 2. 执行质押
  // ...
};
```

#### ❌ 问题：**跳转后用户不知道怎么绑定！**
- 跳转到 Profile 页面
- 但 Profile 页面没有绑定功能
- 用户陷入困惑 😕

---

## 完整流程

### 理想流程（目前缺失）
```
1. 新用户访问邀请链接
   ↓
2. URL 包含推荐人地址: https://hashfi.io?ref=0x1234...
   ↓
3. 前端解析 URL 参数，获取推荐人地址
   ↓
4. 用户连接钱包
   ↓
5. 检查是否已绑定推荐人
   ├─ 已绑定 → 可以直接认购
   └─ 未绑定 → 显示绑定弹窗
      ↓
      用户确认绑定 → 调用 bindReferrer()
      ↓
      绑定成功 → 可以认购
```

### 当前流程（有问题）
```
1. 用户连接钱包
   ↓
2. 用户点击认购
   ↓
3. 检查推荐人状态
   ├─ 已绑定 → 可以认购 ✅
   └─ 未绑定 → 显示警告 ⚠️
      ↓
      跳转到 Profile 页面
      ↓
      ❌ 没有绑定功能！用户懵了
```

---

## 常见问题

### Q1: 为什么必须先绑定推荐人？
**A:** 这是智能合约的硬性规定：
```solidity
require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
```
如果不绑定推荐人，合约会直接回滚交易。

### Q2: 推荐人地址从哪里来？
**A:** 通常有两种方式：
1. **URL 参数** - 通过邀请链接传递：`?ref=0x1234...`
2. **手动输入** - 用户直接输入推荐人地址

### Q3: 可以随便填一个地址当推荐人吗？
**A:** 不可以！合约会验证：
```solidity
// 推荐人必须是已经质押过的用户
require(users[_referrer].totalStakedAmount > 0, "Referrer does not exist");
```

### Q4: 绑定后可以更改推荐人吗？
**A:** 不可以！一旦绑定就永久绑定：
```solidity
require(user.referrer == address(0), "Referrer already bound");
```

### Q5: 如果我没有推荐人怎么办？
**A:** 
- **方案1:** 使用平台的默认推荐人地址（合约 owner）
- **方案2:** 让第一批用户互相推荐
- **方案3:** 设置一个"官方推荐人"地址

---

## 改进建议

### 🚀 方案 1: 在 Profile 页面添加绑定功能

#### 1.1 添加绑定模态框
```vue
<!-- Profile.vue -->
<template>
  <!-- 推荐人行 -->
  <li @click="openBindReferrerModal" class="p-4 cursor-pointer">
    <span>绑定推荐人</span>
    <span>{{ referrerDisplay }}</span>
  </li>
  
  <!-- 绑定推荐人模态框 -->
  <div v-if="showBindModal" class="modal">
    <div class="modal-content">
      <h3>绑定推荐人</h3>
      
      <div v-if="!isReferrerBound">
        <input 
          v-model="referrerAddress" 
          placeholder="输入推荐人地址 0x..."
          class="input"
        />
        <button @click="bindReferrer">确认绑定</button>
      </div>
      
      <div v-else>
        <p>您已绑定推荐人：{{ referrerDisplay }}</p>
        <p class="text-gray-500">推荐人绑定后不可更改</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@/composables/useToast';

const showBindModal = ref(false);
const referrerAddress = ref('');

const isReferrerBound = computed(() => {
  const referrer = userInfo.value?.referrer;
  return referrer && referrer !== '0x0000000000000000000000000000000000000000';
});

const openBindReferrerModal = () => {
  showBindModal.value = true;
};

const bindReferrer = async () => {
  if (!referrerAddress.value) {
    toast.error('请输入推荐人地址');
    return;
  }
  
  try {
    toast.info('正在绑定推荐人...');
    
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'bindReferrer',
      args: [referrerAddress.value as `0x${string}`],
    });
    
    toast.success('绑定成功！');
    showBindModal.value = false;
    refetchUserInfo();
    
  } catch (error: any) {
    if (error.message?.includes('Referrer already bound')) {
      toast.error('您已经绑定过推荐人');
    } else if (error.message?.includes('Referrer does not exist')) {
      toast.error('推荐人不存在，请确认地址是否正确');
    } else if (error.message?.includes('Cannot refer yourself')) {
      toast.error('不能推荐自己');
    } else {
      toast.error(error.message || '绑定失败');
    }
  }
};
</script>
```

### 🚀 方案 2: 在 Staking 页面直接绑定

#### 2.1 优化认购流程
```typescript
const handleStake = async () => {
  const referrer = userInfo.value?.referrer || '0x0000000000000000000000000000000000000000';
  
  // 未绑定推荐人 → 显示绑定模态框
  if (referrer === '0x0000000000000000000000000000000000000000') {
    showBindReferrerModal.value = true;
    return;
  }
  
  // 已绑定 → 继续认购流程
  // ...
};
```

#### 2.2 绑定成功后自动继续认购
```typescript
const bindAndStake = async () => {
  // 1. 绑定推荐人
  await bindReferrer();
  
  // 2. 继续认购
  await handleStake();
};
```

### 🚀 方案 3: URL 参数自动绑定

#### 3.1 解析 URL 参数
```typescript
// router.ts 或 App.vue
import { useRoute } from 'vue-router';

const route = useRoute();
const referrerFromUrl = ref('');

onMounted(() => {
  // 从 URL 获取推荐人地址
  const ref = route.query.ref as string;
  if (ref) {
    referrerFromUrl.value = ref;
    localStorage.setItem('referrer', ref);  // 保存到本地
  } else {
    // 从本地存储读取
    const saved = localStorage.getItem('referrer');
    if (saved) referrerFromUrl.value = saved;
  }
});
```

#### 3.2 首次连接钱包自动绑定
```typescript
watch(address, async (newAddress) => {
  if (!newAddress) return;
  
  // 检查是否已绑定
  const userInfo = await getUserInfo();
  if (userInfo.referrer !== '0x0000000000000000000000000000000000000000') {
    return;  // 已绑定，不处理
  }
  
  // 检查是否有推荐人地址
  const referrer = referrerFromUrl.value;
  if (!referrer) {
    toast.warning('您没有推荐人，请联系推荐人获取邀请链接');
    return;
  }
  
  // 自动绑定
  try {
    toast.info('正在绑定推荐人...');
    await bindReferrer(referrer);
    toast.success('推荐人绑定成功！');
  } catch (error) {
    toast.error('推荐人绑定失败');
  }
});
```

---

## 推荐实现方案

### 🎯 最佳方案：组合方案

**第一步：Profile 页面添加绑定功能**
- 用户可以手动输入推荐人地址
- 显示当前绑定状态
- 提供"复制我的地址"功能（用于邀请他人）

**第二步：Staking 页面优化**
- 未绑定时弹出绑定模态框
- 可以选择：
  - 输入推荐人地址
  - 或跳转到 Profile 页面绑定

**第三步：URL 参数支持**
- 支持通过 `?ref=0x...` 传递推荐人
- 首次连接钱包时提示绑定
- 保存到本地存储，避免丢失

**第四步：默认推荐人**
- 如果用户没有推荐人，提供默认地址
- 可以是合约 owner 或官方地址

---

## 代码示例

### 完整的绑定推荐人组件
```vue
<!-- components/BindReferrerModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">绑定推荐人</h3>
        
        <div v-if="referrerFromUrl" class="bg-blue-50 p-4 rounded-lg mb-4">
          <p class="text-sm text-blue-800 mb-2">检测到推荐人地址：</p>
          <p class="font-mono text-xs break-all">{{ referrerFromUrl }}</p>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">推荐人地址</label>
          <input
            v-model="referrerAddress"
            placeholder="0x..."
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            请输入推荐您的用户地址
          </p>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="flex-1 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            @click="handleBind"
            :disabled="!referrerAddress || isBinding"
            class="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isBinding ? '绑定中...' : '确认绑定' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useWriteContract } from '@wagmi/vue';
import { toast } from '@/composables/useToast';
import abi from '../contract/abi.json';

const props = defineProps<{
  visible: boolean;
  referrerFromUrl?: string;
}>();

const emit = defineEmits<{
  close: [];
  success: [];
}>();

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const { writeContractAsync } = useWriteContract();

const referrerAddress = ref('');
const isBinding = ref(false);

onMounted(() => {
  if (props.referrerFromUrl) {
    referrerAddress.value = props.referrerFromUrl;
  }
});

const handleBind = async () => {
  if (!referrerAddress.value) {
    toast.error('请输入推荐人地址');
    return;
  }
  
  isBinding.value = true;
  
  try {
    toast.info('正在绑定推荐人...');
    
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'bindReferrer',
      args: [referrerAddress.value as `0x${string}`],
    });
    
    toast.success('绑定成功！');
    emit('success');
    emit('close');
    
  } catch (error: any) {
    console.error('Bind referrer error:', error);
    
    if (error.message?.includes('Referrer already bound')) {
      toast.error('您已经绑定过推荐人，无法更改');
    } else if (error.message?.includes('Referrer does not exist')) {
      toast.error('推荐人不存在，请确认该用户已经参与过质押');
    } else if (error.message?.includes('Cannot refer yourself')) {
      toast.error('不能推荐自己');
    } else {
      toast.error(error.message || '绑定失败');
    }
  } finally {
    isBinding.value = false;
  }
};
</script>
```

---

## 📋 实现清单

### ✅ 立即实现（高优先级）
- [ ] 在 Profile.vue 添加绑定推荐人模态框
- [ ] 添加输入框和绑定按钮
- [ ] 实现 bindReferrer 合约调用
- [ ] 添加错误处理和友好提示

### 🔄 后续优化（中优先级）
- [ ] 支持 URL 参数传递推荐人 `?ref=0x...`
- [ ] 在 Staking 页面添加快捷绑定
- [ ] 保存推荐人地址到本地存储
- [ ] 添加"复制我的地址"功能

### 💡 长期规划（低优先级）
- [ ] 生成专属邀请二维码
- [ ] 显示我的邀请统计（邀请人数、收益等）
- [ ] 支持批量邀请
- [ ] 邀请排行榜

---

## 📚 相关资料

- 合约代码：`contract/HashFi.sol` - Line 244 `bindReferrer()`
- 前端代码：`src/views/Profile.vue`
- 认购页面：`src/views/Staking.vue`
- Toast 组件：`src/composables/useToast.ts`

---

**总结：** 当前最大的问题是 Profile 页面只显示推荐人状态，但没有绑定功能。建议立即添加绑定推荐人模态框，让用户可以输入推荐人地址并完成绑定。
