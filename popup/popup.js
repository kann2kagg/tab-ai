/**
 * Popup UI Controller
 */

// Browser API compatibility
const browser = window.browser || window.chrome;

import { Storage } from '../utils/storage.js';

// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const apiStatus = document.getElementById('api-status');
const statusText = document.getElementById('status-text');
const loadingOverlay = document.getElementById('loading-overlay');

// Tab Management
const categorizeTabsBtn = document.getElementById('categorize-tabs-btn');
const inactiveTabsBtn = document.getElementById('inactive-tabs-btn');
const tabsResult = document.getElementById('tabs-result');

// Content Summary
const summarizeBriefBtn = document.getElementById('summarize-brief-btn');
const summarizeDetailedBtn = document.getElementById('summarize-detailed-btn');
const summaryResult = document.getElementById('summary-result');

// Bookmarks
const classifyBookmarksBtn = document.getElementById('classify-bookmarks-btn');
const findDuplicatesBtn = document.getElementById('find-duplicates-btn');
const bookmarksResult = document.getElementById('bookmarks-result');

// History
const analyzeHistoryBtn = document.getElementById('analyze-history-btn');
const viewStatsBtn = document.getElementById('view-stats-btn');
const historyResult = document.getElementById('history-result');

// Quick Actions
const openSidebarBtn = document.getElementById('open-sidebar-btn');

// AI Input Logic
const aiInput = document.getElementById('ai-input');
const aiSubmitBtn = document.getElementById('ai-submit-btn');
const chatResult = document.getElementById('chat-result');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready');
    init();

    // Bind Events
    if (settingsBtn) settingsBtn.addEventListener('click', () => browser.runtime.openOptionsPage());

    if (categorizeTabsBtn) categorizeTabsBtn.addEventListener('click', handleCategorizeTabs);
    if (inactiveTabsBtn) inactiveTabsBtn.addEventListener('click', handleInactiveTabs);
    if (summarizeBriefBtn) summarizeBriefBtn.addEventListener('click', () => handleSummarize('brief'));
    if (summarizeDetailedBtn) summarizeDetailedBtn.addEventListener('click', () => handleSummarize('detailed'));
    if (classifyBookmarksBtn) classifyBookmarksBtn.addEventListener('click', handleClassifyBookmarks);
    if (findDuplicatesBtn) findDuplicatesBtn.addEventListener('click', handleFindDuplicates);
    if (analyzeHistoryBtn) analyzeHistoryBtn.addEventListener('click', handleAnalyzeHistory);
    if (viewStatsBtn) viewStatsBtn.addEventListener('click', handleViewStats);
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', handleOpenSidebar);

    // AI Input Listeners
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAiChat();
        });
    }

    if (aiSubmitBtn) {
        aiSubmitBtn.onclick = handleAiChat; // Direct bind
        aiSubmitBtn.addEventListener('click', handleAiChat);
    }
});


async function init() {
    console.log('Init started');
    // Debug: Show we are running
    showStatus('系统就绪', 'success');

    // Load Chat History
    try {
        const history = await sendMessage({ action: 'getChatHistory' });
        if (history && history.length > 0) {
            renderChatHistory(history);
            chatResult.classList.remove('hidden');
        } else {
            // Default Welcome Message
            renderWelcomeMessage();
        }
    } catch (e) {
        console.error('Failed to load history', e);
        renderWelcomeMessage();
    }

    // Check API configuration
    const isConfigured = await Storage.isApiConfigured();

    if (!isConfigured) {
        showStatus('请先在设置中配置API密钥', 'error');
        disableAllButtons();
    }

    // Auto focus input
    setTimeout(() => {
        if (aiInput) aiInput.focus();
    }, 100);
}

function renderWelcomeMessage() {
    if (!chatResult) return;
    chatResult.innerHTML = `
        <div class="welcome-msg">
            <p><strong>👋 你好! 我是你的AI助手。</strong></p>
            <p>我可以帮你：</p>
            <ul>
                <li>整理杂乱的标签页</li>
                <li>查找和整理书签</li>
                <li>分析浏览历史</li>
            </ul>
            <p>试试输入: "关闭所有搜索标签" 或 "整理书签"</p>
        </div>
    `;
    chatResult.classList.remove('hidden');
}

function renderChatHistory(history) {
    if (!chatResult) return;
    let html = '';

    // Only show last few messages to keep it clean
    const recentHistory = history.slice(-10);

    recentHistory.forEach(msg => {
        if (msg.role === 'user') {
            html += `<p class="user-msg"><strong>You:</strong> ${msg.content}</p>`;
        } else {
            // Re-use logic for AI response rendering
            const result = msg.details || { message: msg.content };
            if (msg.type === 'action' || result.type === 'action') {
                html += `<p class="ai-msg"><strong>AI:</strong> ${result.message || msg.content}</p>`;
                if (result.executionResult) {
                    html += `<div class="exec-result">✅ ${result.executionResult}</div>`;
                }
            } else {
                let content = msg.content || '';
                content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                content = content.replace(/\n/g, '<br>');
                html += `<p class="ai-msg">${content}</p>`;
            }
        }
    });

    // Add spacer
    html += '<hr style="border:0; border-top:1px dashed var(--glass-border); margin:10px 0;">';

    chatResult.innerHTML = html;

    // Scroll to bottom
    setTimeout(() => {
        chatResult.scrollTop = chatResult.scrollHeight;
    }, 100);
}

/**
 * Handle AI Chat (Inline)
 */
async function handleAiChat() {
    console.log('handleAiChat triggered');
    const message = aiInput.value.trim();
    if (!message) return;

    // Visual Feedback
    const originalBtnText = aiSubmitBtn.innerText;
    aiSubmitBtn.innerText = '⏳';
    aiSubmitBtn.style.backgroundColor = 'var(--neon-green)';

    showLoading();
    // Don't hide chatResult, we want to update it
    hideResult(tabsResult);
    hideResult(summaryResult);
    hideResult(bookmarksResult);
    hideResult(historyResult);

    // Clear input
    aiInput.value = '';

    try {
        const result = await sendMessage({
            action: 'handleChat',
            data: { message }
        });

        let html = '';

        // Handle Action Response
        if (result.type === 'action') {
            html += `<p class="ai-msg"><strong>AI:</strong> ${result.message || '执行完毕'}</p>`;
            if (result.executionResult) {
                html += `<div class="exec-result">✅ ${result.executionResult}</div>`;
            }
            if (result.categories) {
                html += '<ul>' + result.categories.map(c => `<li>${c.name} (${c.count || '0'})</li>`).join('') + '</ul>';
            }
        }
        // Handle Message Response
        else {
            let content = result.content || result.message || '';
            content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            content = content.replace(/\n/g, '<br>');
            html += `<p class="ai-msg">${content}</p>`;
        }

        chatResult.innerHTML = html;
        chatResult.classList.remove('hidden');

    } catch (error) {
        showStatus(error.message, 'error');
        chatResult.innerHTML = `<p style="color:var(--danger)">出错啦: ${error.message}</p>`;
        chatResult.classList.remove('hidden');
    } finally {
        hideLoading();
        aiSubmitBtn.innerText = '↵';
        aiSubmitBtn.style.backgroundColor = '';
    }
}

/**
 * Handle tab categorization
 */
async function handleCategorizeTabs() {
    showLoading();
    hideResult(tabsResult);
    hideChatResults();

    try {
        const result = await sendMessage({ action: 'categorizeTabs' });

        if (!result.categories || result.categories.length === 0) {
            showResult(tabsResult, '<p>没有找到可以分组的标签页</p>');
        } else {
            let html = '<h3>标签页分组建议</h3><ul>';
            result.categories.forEach(category => {
                html += `<li><strong>${category.name}</strong> (${category.tabs?.length || 0}个标签)<br>`;
                html += `<small style="color: var(--text-muted);">相关标签</small></li>`;
            });
            html += '</ul>';
            showResult(tabsResult, html);
        }
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle inactive tabs
 */
async function handleInactiveTabs() {
    showLoading();
    hideResult(tabsResult);
    hideChatResults();

    try {
        const result = await sendMessage({ action: 'identifyInactiveTabs' });

        if (!result || result.length === 0) {
            showResult(tabsResult, '<p>没有找到不活跃的标签页</p>');
        } else {
            let html = '<h3>建议关闭的标签页</h3><ul>';
            result.forEach(item => {
                html += `<li><strong>${item.title || '未命名'}</strong><br>`;
                html += `<small style="color: var(--text-muted);">${item.reason}</small><br>`;
                html += `<button class="btn btn-secondary" onclick="closeTab(${item.tabId})" style="margin-top: 4px; padding: 4px 8px; font-size: 12px;">关闭</button></li>`;
            });
            html += '</ul>';
            showResult(tabsResult, html);
        }
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle summarization
 */
async function handleSummarize(length) {
    showLoading();
    hideResult(summaryResult);
    hideChatResults();

    try {
        const result = await sendMessage({
            action: 'summarizeTab',
            data: { length }
        });

        let html = `<h3>${result.title}</h3>`;
        html += `<p>${result.summary}</p>`;
        html += `<small style="color: var(--text-muted); display: block; margin-top: 8px;">`;
        html += `摘要类型: ${length === 'brief' ? '简要' : '详细'}</small>`;

        showResult(summaryResult, html);
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle bookmark classification
 */
async function handleClassifyBookmarks() {
    showLoading();
    hideResult(bookmarksResult);
    hideChatResults();

    try {
        const bookmarks = await sendMessage({ action: 'getAllBookmarks' });

        if (bookmarks.length === 0) {
            showResult(bookmarksResult, '<p>没有找到书签</p>');
            hideLoading();
            return;
        }

        const result = await sendMessage({
            action: 'batchClassifyBookmarks',
            data: { bookmarks: bookmarks.slice(0, 20) }
        });

        let html = '<h3>书签分类建议</h3>';

        if (result.folders && result.folders.length > 0) {
            html += '<ul>';
            result.folders.forEach(folder => {
                html += `<li><strong>${folder.name}</strong> (${folder.bookmarks.length}个书签)<br>`;
                html += `<small style="color: var(--text-muted);">${folder.description}</small></li>`;
            });
            html += '</ul>';
        }

        if (result.suggestions && result.suggestions.length > 0) {
            html += '<p style="margin-top: 12px;"><strong>整理建议:</strong></p><ul>';
            result.suggestions.forEach(suggestion => {
                html += `<li>${suggestion}</li>`;
            });
            html += '</ul>';
        }

        showResult(bookmarksResult, html);
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle find duplicates
 */
async function handleFindDuplicates() {
    showLoading();
    hideResult(bookmarksResult);
    hideChatResults();

    try {
        const duplicates = await sendMessage({ action: 'findDuplicateBookmarks' });

        if (duplicates.length === 0) {
            showResult(bookmarksResult, '<p>没有找到重复的书签</p>');
        } else {
            let html = `<h3>找到 ${duplicates.length} 组重复书签</h3><ul>`;
            duplicates.slice(0, 10).forEach(group => {
                html += `<li>${group.url.substring(0, 50)}... (${group.count}个重复)</li>`;
            });
            html += '</ul>';
            showResult(bookmarksResult, html);
        }
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle history analysis
 */
async function handleAnalyzeHistory() {
    showLoading();
    hideResult(historyResult);
    hideChatResults();

    try {
        const result = await sendMessage({
            action: 'analyzeHistory',
            data: { days: 7 }
        });

        let html = '<h3>浏览行为分析 (过去7天)</h3>';

        if (result.insights) {
            html += '<p><strong>主要类别:</strong> ';
            html += result.insights.topCategories.join(', ') + '</p>';

            if (result.insights.productivityScore) {
                html += `<p><strong>生产力得分:</strong> ${result.insights.productivityScore}/100</p>`;
            }
        }

        if (result.recommendations && result.recommendations.length > 0) {
            html += '<p><strong>建议:</strong></p><ul>';
            result.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul>';
        }

        showResult(historyResult, html);
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle view statistics
 */
async function handleViewStats() {
    showLoading();
    hideResult(historyResult);
    hideChatResults();

    try {
        const stats = await sendMessage({
            action: 'getHistoryStatistics',
            data: { days: 7 }
        });

        let html = '<h3>浏览统计 (过去7天)</h3>';
        html += `<p><strong>总访问次数:</strong> ${stats.totalVisits}</p>`;
        html += `<p><strong>总浏览时间:</strong> ${Math.round(stats.totalTime / 60)}小时</p>`;
        html += `<p><strong>访问网站数:</strong> ${stats.uniqueSites}</p>`;
        html += `<p><strong>日均访问:</strong> ${stats.avgVisitsPerDay}次</p>`;

        if (stats.topSites && stats.topSites.length > 0) {
            html += '<p><strong>访问最多的网站:</strong></p><ul>';
            stats.topSites.slice(0, 5).forEach(site => {
                html += `<li>${site.domain} (${site.visitCount}次)</li>`;
            });
            html += '</ul>';
        }

        showResult(historyResult, html);
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function hideChatResults() {
    // We don't want to hide chat results in the new refactored flow actually
    // But other functions call this. 
    // Let's hide it if it's not the Welcome Message
    // Or just let it persist until new results overwrite it.
    // For now, keep as is to respect other functions' logic
    if (chatResult) chatResult.classList.add('hidden');
}

/**
 * Handle open sidebar
 */
function handleOpenSidebar() {
    browser.windows.create({
        url: browser.runtime.getURL('sidebar/sidebar.html'),
        type: 'popup',
        width: 400,
        height: 600
    });
}

/**
 * Close a tab
 */
window.closeTab = async function (tabId) {
    try {
        await sendMessage({
            action: 'closeTabs',
            data: { tabIds: [tabId] }
        });
        showStatus('标签页已关闭', 'success');
        setTimeout(() => handleInactiveTabs(), 500);
    } catch (error) {
        showStatus(error.message, 'error');
    }
};

/**
 * Send message to background
 */
function sendMessage(message) {
    console.log('[Popup] Sending message:', message);
    return new Promise((resolve, reject) => {
        try {
            browser.runtime.sendMessage(message, response => {
                if (browser.runtime.lastError) {
                    console.error('[Popup] Runtime error:', browser.runtime.lastError);
                    reject(new Error(browser.runtime.lastError.message));
                } else if (response && response.error) {
                    console.error('[Popup] Response error:', response.error);
                    reject(new Error(response.error));
                } else {
                    console.log('[Popup] Success response:', response);
                    resolve(response);
                }
            });
        } catch (e) {
            console.error('[Popup] SendMessage Exception:', e);
            reject(e);
        }
    });
}

/**
 * Show loading overlay
 */
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

/**
 * Show status message
 */
function showStatus(message, type = 'error') {
    statusText.textContent = message;
    apiStatus.className = `status-banner ${type}`;
    apiStatus.classList.remove('hidden');

    setTimeout(() => {
        apiStatus.classList.add('hidden');
    }, 5000);
}

/**
 * Show result
 */
function showResult(element, html) {
    element.innerHTML = html;
    element.classList.remove('hidden');
}

/**
 * Hide result
 */
function hideResult(element) {
    element.classList.add('hidden');
}

/**
 * Disable all buttons
 */
function disableAllButtons() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        if (btn.id !== 'settings-btn') {
            btn.disabled = true;
        }
    });
}
