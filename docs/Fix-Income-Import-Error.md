# 修复 Income.vue 导入错误

## 问题1: JSON 模块导入

### 错误信息
```
SyntaxError: The requested module '/src/core/contract.ts' does not provide an export named 'ABI'
```

### 原因分析
1. Income.vue 使用了正确的导入: `import abi from '../../contract/abi.json'`
2. 但是 TypeScript 配置缺少 JSON 模块支持
3. 需要启用 `resolveJsonModule` 选项

### 解决方案

#### 1. 更新 tsconfig.app.json

添加以下配置:

```json
{
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue", "contract/**/*.json"],
  "compilerOptions": {
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### 2. 更新 src/env.d.ts

添加 JSON 模块类型声明:

```typescript
/// <reference types="vite/client" />

declare module '*.json' {
  const value: any;
  export default value;
}
```

---

## 问题2: Wagmi 导入错误 ⚠️

### 错误信息
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
TypeError: Cannot read properties of null (reading 'useContext')
```

### 原因分析
❌ **错误**: 使用了 React 版本的 wagmi
```typescript
import { useAccount } from 'wagmi';  // 这是 React 版本!
```

✅ **正确**: 应该使用 Vue 版本
```typescript
import { useAccount } from '@wagmi/vue';  // Vue 版本
```

### 解决方案

修改 Income.vue 第121行:

```typescript
// ❌ 错误
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ✅ 正确
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue';
```

---

## 验证步骤

1. ✅ 更新 tsconfig.app.json
2. ✅ 更新 src/env.d.ts
3. ✅ 修改 Income.vue 导入为 `@wagmi/vue`
4. ✅ 检查 HMR 热更新生效
5. ✅ 刷新浏览器确认页面正常加载

## 相关文件

- `/src/views/Income.vue` - 收益页面
- `/contract/abi.json` - 合约 ABI
- `/tsconfig.app.json` - TypeScript 配置
- `/src/env.d.ts` - 类型声明文件

## 重要提醒 ⚠️

在 Vue 项目中，**必须使用 `@wagmi/vue`**，而不是 `wagmi` (React 版本)！

所有其他页面也需要检查这个问题:
- ✅ Profile.vue
- ✅ Staking.vue
- ⚠️ Income.vue (已修复)
- ❓ GenesisNode.vue (待实现)
- ❓ Swap.vue (待实现)
- ❓ Team.vue (待实现)

## 注意事项

如果问题仍然存在，尝试:
1. 清除浏览器缓存 (Ctrl+Shift+R)
2. 删除 `node_modules/.vite` 缓存目录
3. 重启开发服务器

---

**修复时间**: 2025-10-08  
**状态**: ✅ 已完全解决
