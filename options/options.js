/**
 * Options Page Controller
 */

// Browser API compatibility
const browser = window.browser || window.chrome;

import { Storage } from '../utils/storage.js';

// DOM Elements
const apiBaseUrl = document.getElementById('api-base-url');
const apiKey = document.getElementById('api-key');
const apiModel = document.getElementById('api-model');
const testConnectionBtn = document.getElementById('test-connection-btn');
const testResult = document.getElementById('test-result');

const autoSummarize = document.getElementById('auto-summarize');
const autoClassifyBookmarks = document.getElementById('auto-classify-bookmarks');
const historyAnalysisEnabled = document.getElementById('history-analysis-enabled');
const tabInactiveThreshold = document.getElementById('tab-inactive-threshold');
const tabKeepKeywords = document.getElementById('tab-keep-keywords');

const clearAllDataBtn = document.getElementById('clear-all-data-btn');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

// Event Listeners
testConnectionBtn.addEventListener('click', handleTestConnection);
clearAllDataBtn.addEventListener('click', handleClearAllData);
saveBtn.addEventListener('click', handleSave);

// Initialize
init();

async function init() {
    // Load settings
    const settings = await Storage.getMultiple({
        apiBaseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        apiModel: 'gpt-3.5-turbo',
        autoSummarize: false,
        autoClassifyBookmarks: false,
        historyAnalysisEnabled: true,
        tabInactiveThreshold: 30,
        tabKeepKeywords: ''
    });

    // Populate form
    apiBaseUrl.value = settings.apiBaseUrl;
    apiKey.value = settings.apiKey;
    apiModel.value = settings.apiModel;
    autoSummarize.checked = settings.autoSummarize;
    autoClassifyBookmarks.checked = settings.autoClassifyBookmarks;
    historyAnalysisEnabled.checked = settings.historyAnalysisEnabled;
    tabInactiveThreshold.value = settings.tabInactiveThreshold;
    tabKeepKeywords.value = settings.tabKeepKeywords;
}

/**
 * Handle test connection
 */
async function handleTestConnection() {
    console.log('Test connection button clicked');

    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = '⏳ 测试中...';
    testResult.classList.add('hidden');

    try {
        console.log('Saving API settings...');
        // Save current settings temporarily
        await Storage.setMultiple({
            apiBaseUrl: apiBaseUrl.value.trim(),
            apiKey: apiKey.value.trim(),
            apiModel: apiModel.value.trim()
        });

        console.log('Sending test message to background...');
        // Test connection
        const result = await sendMessage({ action: 'testApiConnection' });

        console.log('Test result:', result);

        if (result.success) {
            showTestResult(`✅ 连接成功！使用模型: ${result.model}`, 'success');
        } else {
            showTestResult(`❌ 连接失败: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Test connection error:', error);
        showTestResult(`❌ 测试失败: ${error.message}`, 'error');
    } finally {
        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = '🔍 测试连接';
    }
}

/**
 * Handle save settings
 */
async function handleSave() {
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 保存中...';
    saveStatus.classList.add('hidden');

    try {
        // Validate
        if (!apiKey.value.trim()) {
            showSaveStatus('请输入API Key', 'error');
            return;
        }

        // Save settings
        await Storage.setMultiple({
            apiBaseUrl: apiBaseUrl.value.trim(),
            apiKey: apiKey.value.trim(),
            apiModel: apiModel.value,
            autoSummarize: autoSummarize.checked,
            autoClassifyBookmarks: autoClassifyBookmarks.checked,
            historyAnalysisEnabled: historyAnalysisEnabled.checked,
            tabInactiveThreshold: parseInt(tabInactiveThreshold.value),
            tabKeepKeywords: tabKeepKeywords.value.trim()
        });

        showSaveStatus('✅ 设置已保存', 'success');
    } catch (error) {
        showSaveStatus(`❌ 保存失败: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 保存设置';
    }
}

/**
 * Handle clear all data
 */
async function handleClearAllData() {
    if (!confirm('确定要清空所有数据吗？这将删除所有设置、缓存和聊天记录。')) {
        return;
    }

    if (!confirm('此操作不可恢复！请再次确认。')) {
        return;
    }

    try {
        // Clear all storage except API settings
        const apiConfig = await Storage.getApiConfig();
        await Storage.clear();

        // Restore API config
        await Storage.saveApiConfig(apiConfig);

        alert('✅ 所有数据已清空（保留了API配置）');

        // Reload page
        window.location.reload();
    } catch (error) {
        alert(`❌ 清空失败: ${error.message}`);
    }
}

/**
 * Show test result
 */
function showTestResult(message, type) {
    testResult.textContent = message;
    testResult.className = `test-result ${type}`;
    testResult.classList.remove('hidden');
}

/**
 * Show save status
 */
function showSaveStatus(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `save-status ${type}`;
    saveStatus.classList.remove('hidden');

    setTimeout(() => {
        saveStatus.classList.add('hidden');
    }, 3000);
}

/**
 * Send message to background
 */
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        if (!browser || !browser.runtime) {
            reject(new Error('浏览器扩展API不可用'));
            return;
        }

        browser.runtime.sendMessage(message, response => {
            if (browser.runtime.lastError) {
                reject(new Error(browser.runtime.lastError.message));
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}
