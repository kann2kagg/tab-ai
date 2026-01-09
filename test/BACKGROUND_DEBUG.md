# 后台脚本故障排除

## 问题诊断

如果后台脚本的控制台没有任何输出，可能的原因：

### 1. ES6模块不支持

Safari可能对Service Worker中的ES6模块支持有限。

**解决方案：**临时使用简化版本

编辑 `manifest.json`，将第18行改为：
```json
"service_worker": "background-simple.js",
```

然后重新加载扩展。

### 2. 模块导入失败

某个模块文件有语法错误或路径问题。

**检查方法：**
查看后台脚本控制台是否有模块加载错误。

### 3. Service Worker未启动

Safari可能没有启动Service Worker。

**解决方案：**
1. 完全关闭Safari
2. 重新打开Safari  
3. 重新加载扩展

## 临时测试方案

### 使用简化后台脚本

1. 编辑 `manifest.json`:
```json
"background": {
  "service_worker": "background-simple.js"
},
```

2. 重新加载扩展

3. 打开后台脚本控制台，应该看到：
```
=== Background script started (no modules) ===
Browser API available: true
Runtime API: true
Storage API: true
[Background] Message listener registered
=== Background script ready ===
```

4. 测试连接，应该返回：
```
{
  success: true,
  message: '后台脚本正常工作！（简化版本）',
  model: 'test'
}
```

如果简化版本能工作，说明问题在ES6模块上。

## 下一步

如果简化版本工作：
1. 我们需要将所有代码合并到单个文件
2. 或者使用打包工具（如webpack）

如果简化版本也不工作：
1. 检查Safari版本
2. 检查扩展权限
3. 查看Safari控制台的全局错误信息
