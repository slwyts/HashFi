# CustomSelect 组件使用指南

## 📦 组件位置
`/src/components/admin/CustomSelect.vue`

## 🎯 功能特点

- ✅ 美观的下拉选择器
- ✅ 支持图标和描述文本
- ✅ 移动端友好（大触摸区域）
- ✅ 平滑的动画过渡
- ✅ 点击外部自动关闭
- ✅ 键盘导航支持（未来可扩展）
- ✅ TypeScript 类型支持

## 📝 基本用法

### 1. 导入组件

```vue
<script setup lang="ts">
import CustomSelect, { type SelectOption } from '@/components/admin/CustomSelect.vue';
import { ref } from 'vue';

// 定义选项
const options: SelectOption[] = [
  { 
    value: 'option1', 
    label: '选项一', 
    icon: '📌', 
    description: '这是选项一的描述' 
  },
  { 
    value: 'option2', 
    label: '选项二', 
    icon: '⭐' 
  },
];

// 绑定值
const selected = ref('option1');
</script>
```

### 2. 使用组件

```vue
<template>
  <CustomSelect
    v-model="selected"
    :options="options"
    placeholder="请选择一个选项"
  />
</template>
```

## 🔧 Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `modelValue` | `string \| number \| boolean` | 是 | - | 当前选中的值 |
| `options` | `SelectOption[]` | 是 | - | 选项列表 |
| `placeholder` | `string` | 否 | `'请选择'` | 未选中时的占位文本 |

## 📊 SelectOption 类型

```typescript
interface SelectOption {
  value: string | number | boolean;  // 选项的值
  label: string;                      // 显示的文本
  icon?: string;                      // 可选的emoji图标
  description?: string;               // 可选的描述文本
}
```

## 💡 实际应用示例

### 示例1: 公告类型选择器

```vue
<script setup lang="ts">
import CustomSelect, { type SelectOption } from '@/components/admin/CustomSelect.vue';
import { ref } from 'vue';

const announcementType = ref('normal');

const typeOptions: SelectOption[] = [
  { 
    value: 'normal', 
    label: '普通公告', 
    icon: '📢', 
    description: '一般信息通知' 
  },
  { 
    value: 'important', 
    label: '重要公告', 
    icon: '⚠️', 
    description: '重要事项提醒' 
  },
  { 
    value: 'urgent', 
    label: '紧急公告', 
    icon: '🚨', 
    description: '紧急情况通知' 
  },
];
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      公告类型
    </label>
    <CustomSelect
      v-model="announcementType"
      :options="typeOptions"
      placeholder="选择公告类型"
    />
  </div>
</template>
```

### 示例2: 布尔值选择器

```vue
<script setup lang="ts">
const isPublished = ref(true);

const statusOptions: SelectOption[] = [
  { 
    value: true, 
    label: '立即发布', 
    icon: '✅', 
    description: '内容将立即显示' 
  },
  { 
    value: false, 
    label: '保存草稿', 
    icon: '📦', 
    description: '暂不发布' 
  },
];
</script>

<template>
  <CustomSelect
    v-model="isPublished"
    :options="statusOptions"
  />
</template>
```

### 示例3: 数字值选择器

```vue
<script setup lang="ts">
const priority = ref(1);

const priorityOptions: SelectOption[] = [
  { value: 1, label: '低优先级', icon: '🟢' },
  { value: 2, label: '中优先级', icon: '🟡' },
  { value: 3, label: '高优先级', icon: '🔴' },
];
</script>

<template>
  <CustomSelect
    v-model="priority"
    :options="priorityOptions"
    placeholder="选择优先级"
  />
</template>
```

## 🎨 样式自定义

组件使用 Tailwind CSS，你可以通过以下方式自定义样式：

### 方法1: 包装组件

```vue
<template>
  <div class="custom-select-wrapper">
    <CustomSelect v-model="value" :options="options" />
  </div>
</template>

<style scoped>
.custom-select-wrapper {
  /* 你的自定义样式 */
}
</style>
```

### 方法2: 修改组件源码

直接编辑 `CustomSelect.vue` 中的 Tailwind 类名。

## ⚡ 事件

组件使用 `v-model` 双向绑定，当选项改变时会自动触发 `update:modelValue` 事件。

```vue
<CustomSelect
  v-model="selected"
  :options="options"
  @update:modelValue="handleChange"
/>
```

```typescript
const handleChange = (newValue: string | number | boolean) => {
  console.log('选中的值:', newValue);
};
```

## 🔍 在项目中的使用位置

### 已使用的地方

1. **AnnouncementManagement.vue** - 公告管理
   - 公告类型选择
   - 发布状态选择

2. **BannerManagement.vue** - 轮播图管理
   - 显示状态选择

### 可以使用的地方

1. **GenesisManagement.vue** - 创世节点管理
   - 节点状态选择
   - 节点等级选择

2. **UserManagement.vue** - 用户管理
   - 用户角色选择
   - 用户状态筛选

3. **SystemSettings.vue** - 系统设置
   - 各种配置选项

## 🚀 高级用法

### 动态选项

```vue
<script setup lang="ts">
import { computed } from 'vue';

const userRole = ref('admin');

// 根据条件动态生成选项
const roleOptions = computed<SelectOption[]>(() => {
  const base = [
    { value: 'user', label: '普通用户', icon: '👤' },
    { value: 'admin', label: '管理员', icon: '👑' },
  ];
  
  // 只有超级管理员才能看到这个选项
  if (isSuperAdmin.value) {
    base.push({ 
      value: 'superadmin', 
      label: '超级管理员', 
      icon: '⚡' 
    });
  }
  
  return base;
});
</script>

<template>
  <CustomSelect
    v-model="userRole"
    :options="roleOptions"
  />
</template>
```

### 与表单验证结合

```vue
<script setup lang="ts">
const formData = reactive({
  type: '',
});

const errors = ref({
  type: '',
});

const validateType = () => {
  if (!formData.type) {
    errors.value.type = '请选择类型';
  } else {
    errors.value.type = '';
  }
};
</script>

<template>
  <div>
    <CustomSelect
      v-model="formData.type"
      :options="typeOptions"
      @update:modelValue="validateType"
    />
    <p v-if="errors.type" class="text-red-500 text-sm mt-1">
      {{ errors.type }}
    </p>
  </div>
</template>
```

## 📱 移动端优化

组件已针对移动端优化：

- ✅ 大触摸区域（py-3 = 12px padding）
- ✅ 清晰的视觉反馈
- ✅ 平滑的动画
- ✅ 自动滚动（max-h-60 overflow-auto）

## 🐛 常见问题

### Q: 下拉框被其他元素遮挡？

A: 确保父容器没有 `overflow: hidden`，或者增加组件的 `z-index`：

```vue
<div class="relative z-50">
  <CustomSelect ... />
</div>
```

### Q: 如何预设默认值？

A: 在 `v-model` 绑定的 ref 中设置初始值：

```typescript
const selected = ref('default-value'); // 预设为 'default-value'
```

### Q: 如何禁用某些选项？

A: 当前版本不支持，可以通过过滤 options 数组来实现：

```typescript
const availableOptions = computed(() => 
  allOptions.filter(opt => !opt.disabled)
);
```

## 🎯 最佳实践

1. **使用有意义的图标** - 帮助用户快速识别选项
2. **添加描述文本** - 让复杂选项更易理解
3. **保持选项数量合理** - 超过10个考虑使用搜索功能
4. **提供占位符** - 明确告诉用户这是什么选择
5. **验证用户输入** - 确保选择了有效值

## 🔄 版本历史

- v1.0.0 (2025-10-19) - 初始版本
  - 基本下拉选择功能
  - 图标和描述支持
  - 移动端优化

## 📄 许可

MIT License
