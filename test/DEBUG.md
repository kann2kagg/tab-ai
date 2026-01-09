# 调试"测试连接"问题

## 问题排查步骤

### 1. 检查浏览器控制台

在Safari中：
1. 打开扩展设置页面
2. 右键点击页面 > 检查元素
3. 切换到"控制台"标签
4. 点击"测试连接"按钮
5. 查看控制台输出

预期看到的日志：
```
Test connection button clicked
Saving API settings...
Sending test message to background...
Test result: {success: true, model: "gpt-3.5-turbo"}
```

### 2. 检查后台脚本

1. 在Safari菜单栏选择"开发" > "网页检查器"
2. 在"扩展"部分找到"AI Browser Assistant"
3. 点击"background.js"
4. 查看是否有错误

### 3. 使用测试页面

打开 `test.html` 进行基本API测试：
1. 在Safari中打开扩展文件夹中的 `test.html`
2. 依次点击三个测试按钮
3. 查看每个测试的结果

### 4. 常见问题

#### 问题1: "浏览器扩展API不可用"
**原因**: 页面未在扩展上下文中运行
**解决**: 确保从扩展设置页面打开，而不是直接打开HTML文件

#### 问题2: 没有任何反应
**原因**: JavaScript错误或模块加载失败
**解决**: 
- 检查控制台错误
- 确认文件路径正确
- 重新加载扩展

#### 问题3: "Cannot send message"
**原因**: 后台脚本未运行
**解决**:
- 重启Safari
- 重新加载扩展
- 检查manifest.json配置

### 5. 手动测试步骤

如果自动测试失败，可以手动测试API：

1. 打开浏览器控制台
2. 运行以下代码：

```javascript
// 测试Storage
const browser = window.browser || window.chrome;

// 保存测试数据
await browser.storage.local.set({ 
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test-key',
  apiModel: 'gpt-3.5-turbo'
});

// 读取测试数据
const result = await browser.storage.local.get(['apiBaseUrl', 'apiKey', 'apiModel']);
console.log('Stored data:', result);

// 测试消息传递
browser.runtime.sendMessage(
  { action: 'testApiConnection' },
  response => console.log('Response:', response)
);
```

### 6. Safari特定问题

Safari可能需要特殊配置：

1. **启用开发菜单**
   - Safari > 偏好设置 > 高级
   - 勾选"在菜单栏中显示开发菜单"

2. **允许未签名扩展**
   - 开发 > 允许未签名扩展

3. **重新加载扩展**
   - 开发 > 显示扩展生成器
   - 找到扩展，点击"重新加载"

### 7. 临时解决方案

如果测试连接一直失败，可以：

1. 跳过测试，直接保存设置
2. 尝试使用实际功能（如"智能分组"）
3. 如果实际功能正常，说明API配置正确

## 获取更多帮助

如果以上步骤都无法解决问题，请提供：
1. 浏览器和版本（Safari版本）
2. 控制台错误信息
3. `test.html` 的测试结果
