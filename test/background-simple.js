// 简化的后台脚本 - 不使用ES6模块
console.log('=== Background script started (no modules) ===');

// Browser API compatibility
const browser = window.browser || window.chrome || globalThis.chrome;

console.log('Browser API available:', !!browser);
console.log('Runtime API:', !!browser?.runtime);
console.log('Storage API:', !!browser?.storage);

// Message handler
if (browser && browser.runtime) {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[Background] Message received:', request);

        const { action } = request;

        if (action === 'testApiConnection') {
            console.log('[Background] Handling testApiConnection...');

            // 返回测试响应
            const response = {
                success: true,
                message: '后台脚本正常工作！（简化版本）',
                model: 'test'
            };

            console.log('[Background] Sending response:', response);
            sendResponse(response);
        } else if (action === 'ping') {
            sendResponse({ pong: true });
        } else {
            sendResponse({ error: 'Unknown action: ' + action });
        }

        return true; // Keep channel open
    });

    console.log('[Background] Message listener registered');
} else {
    console.error('[Background] Browser runtime API not available!');
}

console.log('=== Background script ready ===');
