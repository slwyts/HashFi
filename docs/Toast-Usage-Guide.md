# 全局 Toast 组件使用指南

## 📦 功能特性

✅ **全局单例模式** - 在任何组件中都可以使用
✅ **四种类型** - success / error / warning / info
✅ **自动关闭** - 默认 3 秒自动消失
✅ **优雅动画** - 滑入滑出效果
✅ **响应式设计** - 自适应屏幕尺寸
✅ **支持关闭按钮** - 用户可手动关闭

## 🎨 Toast 类型

### Success（成功）
- **颜色：** 绿色背景 + 白色文字
- **图标：** ✓ 对勾图标
- **使用场景：** 操作成功、保存成功、提交成功等

### Error（错误）
- **颜色：** 红色背景 + 白色文字
- **图标：** ✕ 叉号图标
- **使用场景：** 操作失败、验证错误、网络错误等

### Warning（警告）
- **颜色：** 黄色背景 + 白色文字
- **图标：** ⚠ 警告图标
- **使用场景：** 需要注意的信息、潜在问题等

### Info（信息）
- **颜色：** 灰色背景 + 白色文字
- **图标：** ℹ 信息图标
- **使用场景：** 一般提示、处理中状态等

## 📖 使用方法

### 1. 导入 Toast

在任何 Vue 组件中：

```typescript
import { toast } from '@/composables/useToast';
```

### 2. 调用 Toast

#### Success Toast
```typescript
toast.success('认购成功！');
toast.success('授权成功！', 5000); // 自定义 5 秒后关闭
```

#### Error Toast
```typescript
toast.error('认购失败');
toast.error('请先绑定推荐人', 4000);
```

#### Warning Toast
```typescript
toast.warning('请先绑定推荐人才能认购');
toast.warning('余额不足');
```

#### Info Toast
```typescript
toast.info('正在认购...');
toast.info('正在授权 USDT...', 0); // 0 表示不自动关闭
```

### 3. 手动关闭
```typescript
toast.close();
```

## 💻 完整示例

### Staking.vue 中的使用

```typescript
<script setup lang="ts">
import { toast } from '@/composables/useToast';

const handleStake = async () => {
  try {
    // 1. 检查是否绑定推荐人
    if (referrer === '0x0000000000000000000000000000000000000000') {
      toast.warning('请先绑定推荐人才能认购');
      router.push('/profile');
      return;
    }
    
    // 2. 授权 USDT
    toast.info('正在授权 USDT...');
    await approveUsdt();
    toast.success('授权成功！');
    
    // 3. 执行认购
    toast.info('正在认购...');
    await stake();
    toast.success('认购成功！');
    
  } catch (error: any) {
    // 错误处理
    if (error.message?.includes('Must bind a referrer first')) {
      toast.error('请先绑定推荐人');
    } else {
      toast.error(error.message || '认购失败');
    }
  }
};
</script>
```

### Admin.vue 中的使用

```typescript
<script setup lang="ts">
import { toast } from '@/composables/useToast';

const updateBtcData = async () => {
  try {
    toast.info('正在更新 BTC 数据...');
    await writeContractAsync({...});
    toast.success('更新成功！');
  } catch (error: any) {
    toast.error(error.message || '更新失败');
  }
};

const approveNode = async (address: string) => {
  try {
    toast.info('正在批准节点申请...');
    await writeContractAsync({...});
    toast.success('批准成功！');
  } catch (error: any) {
    toast.error('批准失败');
  }
};
</script>
```

## 🔧 API 参考

### toast.success(message, duration?)
- **message**: string - 提示消息
- **duration**: number - 显示时长（毫秒），默认 3000ms

### toast.error(message, duration?)
- **message**: string - 错误消息
- **duration**: number - 显示时长（毫秒），默认 3000ms

### toast.warning(message, duration?)
- **message**: string - 警告消息
- **duration**: number - 显示时长（毫秒），默认 3000ms

### toast.info(message, duration?)
- **message**: string - 信息消息
- **duration**: number - 显示时长（毫秒），默认 3000ms

### toast.close()
立即关闭当前显示的 Toast

## 🎯 最佳实践

### 1. 操作流程提示
```typescript
// ✅ 推荐：分步提示
toast.info('正在授权...');
await approve();
toast.success('授权成功！');

toast.info('正在质押...');
await stake();
toast.success('质押成功！');

// ❌ 不推荐：没有中间状态提示
await approve();
await stake();
toast.success('质押成功！');
```

### 2. 错误处理
```typescript
// ✅ 推荐：提供详细错误信息
catch (error: any) {
  if (error.message?.includes('insufficient funds')) {
    toast.error('余额不足，请充值后再试');
  } else if (error.message?.includes('user rejected')) {
    toast.warning('您已取消交易');
  } else {
    toast.error(error.message || '操作失败');
  }
}

// ❌ 不推荐：通用错误提示
catch (error) {
  toast.error('操作失败');
}
```

### 3. 国际化支持
```typescript
// ✅ 推荐：使用 i18n
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

toast.success(t('stakingPage.stakeSuccess'));
toast.error(t('stakingPage.stakeFailed'));

// ❌ 不推荐：硬编码文本
toast.success('认购成功！');
toast.error('认购失败');
```

### 4. 自定义时长
```typescript
// 快速消失的提示（1秒）
toast.info('已复制', 1000);

// 需要用户注意的警告（5秒）
toast.warning('请注意：此操作不可撤销', 5000);

// 不自动关闭（需手动关闭）
toast.info('正在处理，请稍候...', 0);
// ... 处理完成后
toast.close();
toast.success('处理完成！');
```

## 🐛 问题排查

### Toast 不显示？
1. 确认 `App.vue` 中已添加 `<Toast />` 组件
2. 检查 `import { toast } from '@/composables/useToast'` 路径是否正确
3. 确认 Tailwind CSS 已正确配置

### Toast 样式异常？
1. 检查 `z-index` 是否被其他元素覆盖
2. 确认 Tailwind CSS 的 `backdrop-blur` 是否支持
3. 检查浏览器兼容性

### 多个 Toast 同时显示？
- 当前实现为单例模式，新的 Toast 会替换旧的
- 如需支持多个 Toast 堆叠，请修改 `useToast.ts`

## 🚀 进阶用法

### 链式调用
```typescript
// 不推荐：需要等待才能看到效果
toast.info('步骤1');
toast.info('步骤2');
toast.success('完成');

// 推荐：使用 async/await 控制时序
toast.info('步骤1');
await sleep(1000);
toast.info('步骤2');
await sleep(1000);
toast.success('完成');
```

### 条件提示
```typescript
const result = await someOperation();
result.success 
  ? toast.success('操作成功！') 
  : toast.error('操作失败');
```

### 结合状态管理
```typescript
import { ref } from 'vue';
import { toast } from '@/composables/useToast';

const isProcessing = ref(false);

const doSomething = async () => {
  isProcessing.value = true;
  toast.info('处理中...');
  
  try {
    await api.call();
    toast.success('成功！');
  } catch (error) {
    toast.error('失败');
  } finally {
    isProcessing.value = false;
  }
};
```

## 📝 更新日志

### v1.0.0 (2025-10-07)
- ✅ 初始版本发布
- ✅ 支持 success / error / warning / info 四种类型
- ✅ 自动关闭功能
- ✅ 手动关闭按钮
- ✅ 滑入滑出动画
- ✅ 全局单例模式

## 📚 相关文件

- `src/components/Toast.vue` - Toast 组件
- `src/composables/useToast.ts` - Toast 逻辑和状态管理
- `src/App.vue` - 全局 Toast 挂载点
- `src/views/Staking.vue` - 使用示例

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**HashFi Team** - 让提示更优雅 ✨
