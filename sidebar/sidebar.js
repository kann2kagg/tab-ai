/**
 * Sidebar AI Chat Controller
 */

import { Storage } from '../utils/storage.js';
import { PROMPTS } from '../api/prompts.js';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const contextSelect = document.getElementById('context-select');

// Chat state
let chatHistory = [];
let currentContext = 'none';

// Event Listeners
sendBtn.addEventListener('click', handleSendMessage);
clearChatBtn.addEventListener('click', handleClearChat);
contextSelect.addEventListener('change', (e) => {
    currentContext = e.target.value;
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

messageInput.addEventListener('input', () => {
    autoResize(messageInput);
});

// Initialize
init();

async function init() {
    // Load chat history from storage
    chatHistory = await Storage.get('chatHistory', []);

    // Render existing messages
    if (chatHistory.length > 0) {
        clearWelcomeMessage();
        chatHistory.forEach(msg => {
            appendMessage(msg.role, msg.content, false);
        });
        scrollToBottom();
    }
}

/**
 * Handle send message
 */
async function handleSendMessage() {
    const message = messageInput.value.trim();

    if (!message) return;

    // Clear input
    messageInput.value = '';
    autoResize(messageInput);

    // Clear welcome message if first message
    if (chatHistory.length === 0) {
        clearWelcomeMessage();
    }

    // Add user message
    appendMessage('user', message);
    chatHistory.push({ role: 'user', content: message });

    // Disable input
    setInputEnabled(false);

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
        // Get context if needed
        let pageContent = null;
        if (currentContext !== 'none') {
            pageContent = await getContext();
        }

        // Prepare messages
        const messages = PROMPTS.chat(message, pageContent, chatHistory.slice(-10)); // Last 10 messages

        // Send to background for API call
        const response = await sendMessage({
            action: 'chat',
            data: { messages, stream: false }
        });

        // Remove typing indicator
        typingEl.remove();

        // Handle different response types
        let assistantMessage = '';

        if (response.type === 'action') {
            assistantMessage = `${response.message}\n\n`;
            if (response.executionResult) {
                assistantMessage += `✅ ${response.executionResult}`;
            }
            if (response.categories && response.categories.length > 0) {
                assistantMessage += '\n\n分类结果:\n';
                response.categories.forEach(cat => {
                    assistantMessage += `📁 ${cat.name}\n`;
                });
            }
        } else if (response.type === 'error') {
            assistantMessage = `❌ ${response.content}`;
        } else if (response.content) {
            assistantMessage = response.content;
        } else {
            assistantMessage = '操作已完成';
        }

        // Add assistant response
        appendMessage('assistant', assistantMessage);
        chatHistory.push({ role: 'assistant', content: assistantMessage });

        // Save chat history
        await Storage.set('chatHistory', chatHistory);

    } catch (error) {
        typingEl.remove();
        appendMessage('assistant', `❌ 抱歉，发生了错误: ${error.message}`);
    } finally {
        setInputEnabled(true);
        messageInput.focus();
    }
}

/**
 * Get context based on selection
 */
async function getContext() {
    if (currentContext === 'current-page') {
        // Get current tab content
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            try {
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'extractContent'
                });
                return response.content;
            } catch (error) {
                console.error('Failed to get page content:', error);
                return null;
            }
        }
    } else if (currentContext === 'all-tabs') {
        // Get all tab titles
        const tabs = await chrome.tabs.query({});
        const tabList = tabs.map(t => `${t.title} - ${t.url}`).join('\n');
        return `当前打开的标签页:\n${tabList}`;
    }

    return null;
}

/**
 * Handle clear chat
 */
async function handleClearChat() {
    if (confirm('确定要清空所有对话吗？')) {
        chatHistory = [];
        await Storage.set('chatHistory', []);

        // Clear messages
        chatMessages.innerHTML = '';

        // Show welcome message
        showWelcomeMessage();
    }
}

/**
 * Append message to chat
 */
function appendMessage(role, content, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format content (simple markdown support)
    contentDiv.innerHTML = formatMessage(content);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Format message with basic markdown
 */
function formatMessage(text) {
    // Escape HTML
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';

    contentDiv.appendChild(typingDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    return messageDiv;
}

/**
 * Clear welcome message
 */
function clearWelcomeMessage() {
    const welcome = chatMessages.querySelector('.welcome-message');
    if (welcome) {
        welcome.remove();
    }
}

/**
 * Show welcome message
 */
function showWelcomeMessage() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
    <h2>🗂️ 智能浏览器助手</h2>
    <p>我可以帮您管理标签页和书签:</p>
    <ul>
      <li>🧹 "帮我关闭所有社交媒体标签"</li>
      <li>💾 "把当前标签页保存到新书签文件夹"</li>
      <li>⏰ "关闭超过1小时没用的标签"</li>
      <li>🔎 "我不记得有没有存过关于React的书签"</li>
      <li>📑 "帮我找找所有关于AI的重复书签"</li>
      <li>📊 "分析一下我打开的标签"</li>
    </ul>
    <p style="margin-top: 16px; color: var(--text-muted); font-size: 13px;">
      试试告诉我你想做什么...
    </p>
  `;

    chatMessages.appendChild(welcomeDiv);
}

/**
 * Enable/disable input
 */
function setInputEnabled(enabled) {
    messageInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
}

/**
 * Auto-resize textarea
 */
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * Scroll to bottom
 */
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Send message to background
 */
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}
