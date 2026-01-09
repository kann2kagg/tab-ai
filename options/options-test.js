// 简单的测试脚本 - 不使用ES6模块
console.log('=== Options page loaded ===');

// 测试按钮点击
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');

    const testBtn = document.getElementById('test-connection-btn');
    console.log('Test button:', testBtn);

    if (testBtn) {
        testBtn.addEventListener('click', function () {
            console.log('✅ 按钮被点击了！');
            alert('按钮点击测试成功！如果你看到这个消息，说明JavaScript正常工作。');
        });
    } else {
        console.error('❌ 找不到测试按钮');
    }

    // 测试浏览器API
    const browser = window.browser || window.chrome;
    console.log('Browser API:', browser);
    console.log('Storage API:', browser?.storage);
    console.log('Runtime API:', browser?.runtime);
});

console.log('=== Script end ===');
