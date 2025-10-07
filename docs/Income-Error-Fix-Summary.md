# Income.vue 错误修复总结

## 🐛 遇到的问题

### 问题 1: JSON 模块导入错误
```
SyntaxError: The requested module '/src/core/contract.ts' does not provide an export named 'ABI'
```

### 问题 2: React Hooks 错误
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
TypeError: Cannot read properties of null (reading 'useContext')
```

---

## ✅ 解决方案

### 1. TypeScript 配置 - 支持 JSON 导入

**文件**: `tsconfig.app.json`

添加:
```json
{
  "include": ["contract/**/*.json"],
  "compilerOptions": {
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**文件**: `src/env.d.ts`

添加:
```typescript
declare module '*.json' {
  const value: any;
  export default value;
}
```

### 2. 修复 Wagmi 导入 - 使用 Vue 版本

**错误代码** (第121行):
```typescript
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
```

**正确代码**:
```typescript
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue';
```

---

## 🔍 根本原因

1. **JSON 导入**: Vite 需要显式的 TypeScript 配置才能导入 JSON 文件
2. **Wagmi 包**: Vue 项目必须使用 `@wagmi/vue`，不能使用 `wagmi` (React 版本)

---

## ✨ 修复后的状态

- ✅ Income.vue 页面可以正常访问
- ✅ 待领取收益数据正确显示
- ✅ 收益记录列表正确渲染
- ✅ 提现功能正常工作
- ✅ 无 TypeScript 编译错误
- ✅ 无 React/Vue 冲突错误

---

## 📋 检查清单

所有使用 wagmi 的文件都已验证:

- ✅ `src/views/Profile.vue` - 使用 `@wagmi/vue` ✓
- ✅ `src/views/Staking.vue` - 使用 `@wagmi/vue` ✓
- ✅ `src/views/Admin.vue` - 使用 `@wagmi/vue` ✓
- ✅ `src/views/Income.vue` - 已修复为 `@wagmi/vue` ✓

---

## 💡 经验教训

### Vue 3 + Wagmi 集成注意事项

1. **始终使用 `@wagmi/vue`** - 不是 `wagmi`
2. **启用 JSON 模块解析** - TypeScript 配置
3. **热更新验证** - 修改后检查 HMR 是否成功
4. **浏览器缓存** - 必要时强制刷新 (Ctrl+Shift+R)

### 未来开发提醒

在实现新页面时 (GenesisNode.vue, Swap.vue, Team.vue):
- ✅ 使用 `import { ... } from '@wagmi/vue'`
- ✅ 使用 `import abi from '../../contract/abi.json'`
- ✅ 使用 `const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS`

---

**修复完成时间**: 2025-10-08 00:06  
**状态**: ✅ 完全解决  
**影响文件**: 2个配置文件 + 1个 Vue 组件
