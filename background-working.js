console.log('=== Background Script Loading ===');

const browser = self.chrome || globalThis.chrome;
console.log('[Background] Browser API:', !!browser);

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return '';
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

// ============================================
// STORAGE
// ============================================

const Storage = {
  async get(key, defaultValue = null) {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },

  async getMultiple(defaults) {
    try {
      const keys = Object.keys(defaults);
      const result = await browser.storage.local.get(keys);
      const merged = { ...defaults };
      keys.forEach(key => {
        if (result[key] !== undefined) {
          merged[key] = result[key];
        }
      });
      return merged;
    } catch (error) {
      console.error('Storage getMultiple error:', error);
      return defaults;
    }
  },

  async setMultiple(items) {
    try {
      await browser.storage.local.set(items);
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      throw error;
    }
  }
};

// ============================================
// AI PROMPTS
// ============================================

const PROMPTS = {
  categorizeTabs(tabs) {
    return [{
      role: 'system',
      content: '你是一个智能标签页管理助手。根据标签页的标题和URL，将它们分类到合适的类别中。'
    }, {
      role: 'user',
      content: `请将以下标签页分类。返回JSON格式: {"categories": [{"name": "类别名", "tabs": [索引数组]}]}

标签页列表:
${tabs.map((tab, i) => `${i}. ${tab.title} (${tab.domain})`).join('\n')}

要求:
1. 创建有意义的类别名称（中文）
2. 每个标签页归入最合适的类别
3. 类别数量适中（3-8个）`
    }];
  },

  identifyInactiveTabs(tabs) {
    return [{
      role: 'system',
      content: '你是一个智能标签页清理助手。识别哪些标签页可能不再需要，并说明原因。'
    }, {
      role: 'user',
      content: `分析以下不活跃标签页，建议哪些可以关闭。返回JSON: {"inactive": [{"index": 索引, "reason": "原因"}]}

${tabs.map((tab, i) => `${i}. ${tab.title} - 最后访问: ${tab.lastAccessed}`).join('\n')}

只推荐真正不再需要的标签页。`
    }];
  },

  summarizeContent(content, length) {
    return [{
      role: 'system',
      content: `你是一个专业的内容总结助手。生成${length === 'brief' ? '简要' : '详细'}的摘要。`
    }, {
      role: 'user',
      content: `请为以下内容生成${length === 'brief' ? '简要（2-3句话）' : '详细'}摘要：

标题: ${content.title}
内容: ${content.text.slice(0, 6000)}

用中文回答，突出核心要点。`
    }];
  }
};

// ============================================
// OPENAI CLIENT
// ============================================

class OpenAIClient {
  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    console.log('[OpenAI] Initializing...');
    const config = await Storage.getMultiple({
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      apiModel: 'gpt-3.5-turbo'
    });

    this.baseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
    this.model = config.apiModel;
    this.initialized = !!this.apiKey;

    console.log('[OpenAI] Config loaded:', {
      baseUrl: this.baseUrl,
      model: this.model,
      hasKey: !!this.apiKey
    });

    return this.initialized;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('API未配置');
      }
    }
  }

  async createChatCompletion(messages, options = {}) {
    await this.ensureInitialized();

    const { temperature = 0.7, maxTokens = 2000 } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    return await response.json();
  }

  async testConnection() {
    console.log('[OpenAI] Testing connection...');

    try {
      this.initialized = false;
      const success = await this.initialize();

      if (!success) {
        return { success: false, message: 'API密钥未配置' };
      }

      console.log('[OpenAI] Sending test request to:', this.baseUrl);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      console.log('[OpenAI] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[OpenAI] Test successful!', data);

      return {
        success: true,
        message: 'API连接成功',
        model: this.model
      };
    } catch (error) {
      console.error('[OpenAI] Test failed:', error);
      return {
        success: false,
        message: error.message || '连接失败'
      };
    }
  }
}

const openAIClient = new OpenAIClient();

// ============================================
// FEATURE FUNCTIONS
// ============================================

async function categorizeTabs() {
  try {
    console.log('[categorizeTabs] Starting...');
    const tabs = await browser.tabs.query({});

    // Filter out internal tabs (chrome://, edge://, about:, etc.)
    const validTabs = tabs.filter(tab => {
      const url = tab.url || '';
      return !url.startsWith('chrome://') &&
        !url.startsWith('edge://') &&
        !url.startsWith('about:') &&
        !url.startsWith('chrome-extension://') &&
        url.length > 0;
    });

    if (validTabs.length === 0) return { categories: [] };

    const tabInfo = validTabs.map(tab => ({
      title: tab.title || 'Untitled',
      url: tab.url || '',
      domain: extractDomain(tab.url)
    }));

    const messages = PROMPTS.categorizeTabs(tabInfo);
    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1500
    });

    const content = response.choices[0].message.content;
    console.log('[categorizeTabs] AI response:', content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        return { categories: [] };
      }
    }

    return result;
  } catch (error) {
    console.error('[categorizeTabs] Error:', error);
    throw error;
  }
}

async function identifyInactiveTabs() {
  try {
    console.log('[identifyInactiveTabs] Starting...');
    const tabs = await browser.tabs.query({});
    const now = Date.now();

    const threshold = await Storage.get('tabInactiveThreshold', 30);
    const thresholdMs = threshold * 60 * 1000;

    const keepKeywordsStr = await Storage.get('tabKeepKeywords', '');
    const keepKeywords = keepKeywordsStr
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    const inactiveTabs = tabs.filter(tab => {
      if (tab.pinned || tab.active) return false;

      const timeSinceAccess = now - (tab.lastAccessed || now);
      if (timeSinceAccess <= thresholdMs) return false;

      if (keepKeywords.length > 0) {
        const tabText = `${tab.title} ${tab.url}`.toLowerCase();
        if (keepKeywords.some(keyword => tabText.includes(keyword))) {
          return false;
        }
      }

      return true;
    }).map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      lastAccessed: formatDate(tab.lastAccessed || now)
    }));

    if (inactiveTabs.length === 0) return [];

    const messages = PROMPTS.identifyInactiveTabs(inactiveTabs);
    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1000
    });

    const content = response.choices[0].message.content;
    let result;

    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        return inactiveTabs.map((tab, i) => ({
          index: i,
          tabId: tab.id,
          title: tab.title,
          reason: `超过${threshold}分钟未访问`
        }));
      }
    }

    return result.inactive.map(item => ({
      ...item,
      tabId: inactiveTabs[item.index]?.id,
      title: inactiveTabs[item.index]?.title,
      url: inactiveTabs[item.index]?.url
    }));
  } catch (error) {
    console.error('[identifyInactiveTabs] Error:', error);
    throw error;
  }
}

async function summarizeTab(tabId, length = 'brief') {
  try {
    console.log('[summarizeTab] Starting...');
    const currentTabId = tabId || (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;

    if (!currentTabId) {
      throw new Error('No active tab found');
    }

    const results = await browser.scripting.executeScript({
      target: { tabId: currentTabId },
      func: function () {
        const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '#content', '.content'];
        let mainContent = null;
        for (const selector of selectors) {
          mainContent = document.querySelector(selector);
          if (mainContent) break;
        }
        const textContent = mainContent ? mainContent.innerText : document.body.innerText;
        return {
          text: textContent.slice(0, 8000),
          title: document.title || '',
          url: window.location.href || '',
          description: document.querySelector('meta[name="description"]')?.content || ''
        };
      }
    });

    const content = results[0]?.result;

    if (!content || !content.text) {
      throw new Error('Failed to extract page content');
    }

    const messages = PROMPTS.summarizeContent(content, length);
    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.5,
      maxTokens: length === 'brief' ? 500 : 1500
    });

    return {
      summary: response.choices[0].message.content,
      title: content.title,
      url: content.url
    };
  } catch (error) {
    console.error('[summarizeTab] Error:', error);
    throw error;
  }
}

// Global chat history
let GLOBAL_CHAT_HISTORY = [];

async function handleChat(data) {
  try {
    console.log('[handleChat] Starting...');

    const { messages, message } = data;
    let userMessage = '';

    if (message && typeof message === 'string') {
      userMessage = message;
    } else if (messages && Array.isArray(messages)) {
      // ... (existing logic)
    }

    // Add user message to history
    if (userMessage) {
      GLOBAL_CHAT_HISTORY.push({ role: 'user', content: userMessage, timestamp: Date.now() });
    }

    // Use TabAssistant
    const result = await handleTabAssistant(userMessage);

    // Add AI response to history
    if (result) {
      GLOBAL_CHAT_HISTORY.push({
        role: 'assistant',
        content: result.content || result.message || JSON.stringify(result),
        type: result.type, // 'action' or 'message'
        timestamp: Date.now(),
        details: result // Store full object for rendering
      });

      // Keep history manageable
      if (GLOBAL_CHAT_HISTORY.length > 50) {
        GLOBAL_CHAT_HISTORY = GLOBAL_CHAT_HISTORY.slice(-50);
      }
    }

    return result;

  } catch (error) {
    // ...
  }
}

// ... existing code ...


// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(request, sender) {
  const { action, data } = request;
  console.log(`[Background] Handling: ${action}`);

  try {
    switch (action) {
      case 'testApiConnection':
        console.log('[Background] Testing API connection...');
        const result = await openAIClient.testConnection();
        console.log('[Background] Test result:', result);
        return result;

      case 'getApiConfig':
        return await Storage.getMultiple({
          apiBaseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          apiModel: 'gpt-3.5-turbo'
        });

      case 'categorizeTabs':
        return await categorizeTabs();

      case 'identifyInactiveTabs':
        return await identifyInactiveTabs();

      case 'closeTabs':
        if (data && data.tabIds) {
          await Promise.all(data.tabIds.map(id => browser.tabs.remove(id)));
        }
        return { success: true };

      case 'summarizeTab':
        return await summarizeTab(data?.tabId, data?.length);

      case 'chat':
      case 'handleChat': // Add alias for popup
        return await handleChat(data);

      case 'ping':
        return { pong: true, timestamp: Date.now() };

      // Bookmark management
      case 'getAllBookmarks':
        return await getAllBookmarks();

      case 'findDuplicateBookmarks':
        return await findDuplicateBookmarks();

      case 'batchClassifyBookmarks':
        return await batchClassifyBookmarks(data.bookmarks);

      // History analysis
      case 'analyzeHistory':
        return await analyzeHistory(data?.days || 7);

      case 'getHistoryStatistics':
        return await getHistoryStatistics(data?.days || 7);

      case 'getChatHistory':
        return GLOBAL_CHAT_HISTORY || [];

      default:
        console.warn('[Background] Unknown action:', action);
        return { error: 'Unknown action: ' + action };
    }
  } catch (error) {
    console.error('[Background] Error handling', action, ':', error);
    return { error: error.message || 'Unknown error' };
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

if (browser && browser.runtime) {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Background] Message received:', request);

    handleMessage(request, sender)
      .then(response => {
        console.log('[Background] Sending response:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('[Background] Handler error:', error);
        sendResponse({ error: error.message });
      });

    return true;
  });

  console.log('[Background] Message listener registered');
}

if (browser && browser.runtime && browser.runtime.onInstalled) {
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log('[Background] Installed:', details.reason);

    // 1. Initialize Settings
    if (details.reason === 'install') {
      await Storage.setMultiple({
        tabInactiveThreshold: 30,
        autoSummarize: false,
        autoClassifyBookmarks: false,
        historyAnalysisEnabled: true,
        tabKeepKeywords: ''
      });

      if (browser.runtime.openOptionsPage) {
        browser.runtime.openOptionsPage();
      }
    }

    // 2. Inject Floating Ball into ALL existing tabs
    // This ensures the user sees the floating ball immediately without refreshing
    try {
      console.log('[Background] Injecting content scripts into existing tabs...');
      const tabs = await browser.tabs.query({});

      for (const tab of tabs) {
        // Skip restricted URLs
        if (!tab.url ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:') ||
          tab.url.startsWith('chrome-extension://')) {
          continue;
        }

        try {
          // Inject CSS
          await browser.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content/floating.css']
          });

          // Inject JS
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/floating.js']
          });
          console.log(`[Background] Injected into tab ${tab.id} (${tab.title})`);
        } catch (err) {
          // It's normal to fail on some strict pages or if tab is closing
          // console.warn(`[Background] Failed to inject into tab ${tab.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[Background] Injection loop error:', error);
    }
  });
}

console.log('=== Background Script Ready ===');

// ============================================
// BOOKMARK FUNCTIONS
// ============================================

async function getAllBookmarks() {
  try {
    console.log('[getAllBookmarks] Starting...');
    const tree = await browser.bookmarks.getTree();

    function flattenBookmarks(nodes, result = []) {
      for (const node of nodes) {
        if (node.url) {
          result.push({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded
          });
        }
        if (node.children) {
          flattenBookmarks(node.children, result);
        }
      }
      return result;
    }

    return flattenBookmarks(tree);
  } catch (error) {
    console.error('[getAllBookmarks] Error:', error);
    throw error;
  }
}

async function findDuplicateBookmarks() {
  try {
    console.log('[findDuplicateBookmarks] Starting...');
    const allBookmarks = await getAllBookmarks();

    const urlMap = new Map();
    allBookmarks.forEach(bookmark => {
      const url = bookmark.url;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url).push(bookmark);
    });

    const duplicates = [];
    urlMap.forEach((bookmarks, url) => {
      if (bookmarks.length > 1) {
        duplicates.push({
          url: url,
          count: bookmarks.length,
          bookmarks: bookmarks
        });
      }
    });

    return duplicates.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[findDuplicateBookmarks] Error:', error);
    throw error;
  }
}

async function batchClassifyBookmarks(bookmarks) {
  try {
    console.log('[batchClassifyBookmarks] Starting...');

    const messages = [{
      role: 'system',
      content: '你是一个智能书签管理助手。根据书签的标题和URL，建议合理的文件夹分类。'
    }, {
      role: 'user',
      content: `请为以下书签建议分类。返回JSON格式: {"folders": [{"name": "文件夹名", "description": "说明", "bookmarks": [索引数组]}], "suggestions": ["建议1", "建议2"]}

书签列表:
${bookmarks.slice(0, 20).map((b, i) => `${i}. ${b.title} - ${b.url}`).join('\n')}

要求:
1. 创建有意义的文件夹名称（中文）
2. 每个书签归入最合适的类别
3. 提供整理建议`
    }];

    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1500
    });

    const content = response.choices[0].message.content;
    let result;

    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        return { folders: [], suggestions: [] };
      }
    }

    return result;
  } catch (error) {
    console.error('[batchClassifyBookmarks] Error:', error);
    throw error;
  }
}

// ============================================
// HISTORY FUNCTIONS
// ============================================

async function analyzeHistory(days = 7) {
  try {
    console.log('[analyzeHistory] Starting...');
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const historyItems = await browser.history.search({
      text: '',
      startTime: startTime,
      maxResults: 500
    });

    if (historyItems.length === 0) {
      return {
        insights: { topCategories: [], productivityScore: 0 },
        recommendations: ['暂无足够数据进行分析']
      };
    }

    const messages = [{
      role: 'system',
      content: '你是一个浏览行为分析助手。分析用户的浏览历史，提供洞察和建议。'
    }, {
      role: 'user',
      content: `分析以下浏览历史（过去${days}天）。返回JSON: {"insights": {"topCategories": ["类别1", "类别2"], "productivityScore": 75}, "recommendations": ["建议1", "建议2"]}

访问记录（前50条）:
${historyItems.slice(0, 50).map((item, i) => `${i}. ${item.title} - ${extractDomain(item.url)}`).join('\n')}

要求:
1. 识别主要浏览类别
2. 评估生产力得分(0-100)
3. 提供改进建议`
    }];

    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.5,
      maxTokens: 1000
    });

    const content = response.choices[0].message.content;
    let result;

    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        return {
          insights: { topCategories: ['工作', '娱乐'], productivityScore: 50 },
          recommendations: ['建议合理安排浏览时间']
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[analyzeHistory] Error:', error);
    throw error;
  }
}

async function getHistoryStatistics(days = 7) {
  try {
    console.log('[getHistoryStatistics] Starting...');
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const historyItems = await browser.history.search({
      text: '',
      startTime: startTime,
      maxResults: 10000
    });

    const domainMap = new Map();
    historyItems.forEach(item => {
      const domain = extractDomain(item.url);
      if (!domainMap.has(domain)) {
        domainMap.set(domain, { domain, visitCount: 0 });
      }
      domainMap.get(domain).visitCount++;
    });

    const topSites = Array.from(domainMap.values())
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    return {
      totalVisits: historyItems.length,
      totalTime: days * 24 * 60, // 估算
      uniqueSites: domainMap.size,
      avgVisitsPerDay: Math.round(historyItems.length / days),
      topSites: topSites
    };
  } catch (error) {
    console.error('[getHistoryStatistics] Error:', error);
    throw error;
  }
}


// ============================================
// AI TAB ASSISTANT (Enhanced)
// ============================================

async function handleTabAssistant(userMessage) {
  try {
    console.log('[TabAssistant] Processing:', userMessage);

    // 1. Get Tabs (filtered)
    const allTabs = await browser.tabs.query({});
    const tabs = allTabs.filter(tab => {
      const url = tab.url || '';
      return !url.startsWith('chrome://') &&
        !url.startsWith('edge://') &&
        !url.startsWith('about:') &&
        !url.startsWith('chrome-extension://') &&
        url.length > 0;
    });

    const tabInfo = tabs.map((tab, i) => ({
      index: i,
      id: tab.id,
      title: tab.title,
      url: tab.url,
      domain: extractDomain(tab.url),
      active: tab.active,
      pinned: tab.pinned
    }));

    // 2. Get Bookmarks (simplified)
    const allBookmarks = await getAllBookmarks();
    const bookmarkSummary = `Total Bookmarks: ${allBookmarks.length}`;

    // 3. Construct System Prompt
    const messages = [{
      role: 'system',
      content: `你是一个智能浏览器助手。你可以同时管理标签页和书签。

【当前标签页】(${tabInfo.length}个):
${tabInfo.map(t => `[${t.index}] ${t.title} - ${t.domain} ${t.pinned ? '(已固定)' : ''} ${t.active ? '(当前)' : ''}`).join('\n')}

【书签概况】:
${bookmarkSummary}

你可以执行的操作：
1. CLOSE_TABS: 关闭指定的标签页
2. KEEP_TABS: 只保留指定的标签页
3. ANALYZE_TABS: 分析标签页
4. CATEGORIZE_TABS: 标签页分类
5. LIST_BOOKMARKS: 列出匹配查询的书签
6. FIND_DUPLICATE_BOOKMARKS: 查找重复书签
7. SAVE_TABS_AS_BOOKMARKS: 将当前标签页保存为书签文件夹

响应格式（JSON）：
{
  "action": "CLOSE_TABS|KEEP_TABS|ANALYZE_TABS|CATEGORIZE_TABS|LIST_BOOKMARKS|FIND_DUPLICATE_BOOKMARKS|SAVE_TABS_AS_BOOKMARKS",
  "tabIndices": [索引数组, 仅用于标签操作],
  "bookmarkQuery": "搜索关键词(仅LIST_BOOKMARKS)",
  "message": "向用户的说明文字",
  "categories": [仅CATEGORIZE时]
}

规则：
- 标签操作：永远不要关闭当前/固定标签
- 书签操作：目前支持查找和列出
- 查找书签时，请提取用户查询中的关键词`
    }, {
      role: 'user',
      content: userMessage
    }];

    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 1500
    });

    const content = response.choices[0].message.content;
    console.log('[TabAssistant] AI response:', content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        console.warn('[TabAssistant] Failed to parse JSON, treating as raw message');
        return { type: 'message', content: content };
      }
    }

    console.log('[TabAssistant] Parsed result:', JSON.stringify(result));

    // Execute action
    let executionResult = '';

    switch (result.action) {
      case 'CLOSE_TABS':
        console.log('[TabAssistant] Action: CLOSE_TABS', result.tabIndices);
        if (result.tabIndices && result.tabIndices.length > 0) {
          const tabIdsToClose = result.tabIndices
            .map(i => tabInfo[i])
            .filter(t => t && !t.active && !t.pinned)
            .map(t => t.id);

          console.log('[TabAssistant] Identifed tabs to close:', tabIdsToClose);

          if (tabIdsToClose.length > 0) {
            await Promise.all(tabIdsToClose.map(id => browser.tabs.remove(id)));
            executionResult = `已关闭 ${tabIdsToClose.length} 个标签页`;
          } else {
            executionResult = '没有可关闭的标签页 (当前/固定标签页受保护)';
          }
        }
        break;

      case 'KEEP_TABS':
        if (result.tabIndices && result.tabIndices.length > 0) {
          const keepIndices = new Set(result.tabIndices);
          const tabIdsToClose = tabInfo
            .filter((t, i) => !keepIndices.has(i) && !t.active && !t.pinned)
            .map(t => t.id);

          if (tabIdsToClose.length > 0) {
            await Promise.all(tabIdsToClose.map(id => browser.tabs.remove(id)));
            executionResult = `保留了 ${result.tabIndices.length} 个标签页，关闭了 ${tabIdsToClose.length} 个`;
          }
        }
        break;

      case 'SAVE_TABS_AS_BOOKMARKS':
        const folderName = result.folderName || `Saved Tabs ${new Date().toLocaleDateString()}`;
        try {
          // Create folder
          const folder = await browser.bookmarks.create({ title: folderName });

          // Determine tabs to save
          let tabsToSave = [];
          if (result.tabIndices && result.tabIndices.length > 0) {
            tabsToSave = result.tabIndices.map(i => tabInfo[i]).filter(t => t);
          } else {
            // If no indices, save all tabs
            tabsToSave = tabInfo;
          }

          // Create bookmarks
          let savedCount = 0;
          for (const tab of tabsToSave) {
            try {
              await browser.bookmarks.create({
                parentId: folder.id,
                title: tab.title,
                url: tab.url
              });
              savedCount++;
            } catch (err) {
              console.error('Error saving bookmark:', err);
            }
          }

          executionResult = `已将 ${savedCount} 个标签保存到新书签文件夹 "${folderName}"`;
        } catch (e) {
          console.error('Error creating bookmark folder:', e);
          executionResult = `保存书签失败: ${e.message}`;
        }
        break;

      case 'LIST_BOOKMARKS':
        if (result.bookmarkQuery) {
          const query = result.bookmarkQuery.toLowerCase();
          const matches = allBookmarks.filter(b =>
            b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
          ).slice(0, 10);

          if (matches.length > 0) {
            executionResult = `找到 ${matches.length} 个相关书签:\n` +
              matches.map(b => `- [${b.title}](${b.url})`).join('\n');
          } else {
            executionResult = '未找到匹配的书签';
          }
        } else {
          executionResult = '请提供搜索关键词';
        }
        break;

      case 'FIND_DUPLICATE_BOOKMARKS':
        const dups = await findDuplicateBookmarks();
        if (dups.length > 0) {
          executionResult = `发现了 ${dups.length} 组重复书签，建议使用"书签管理"功能进行清理。`;
        } else {
          executionResult = '未发现重复书签。';
        }
        break;

      case 'ANALYZE':
      case 'ANALYZE_TABS':
      case 'CATEGORIZE':
      case 'CATEGORIZE_TABS':
        executionResult = '';
        break;
    }

    return {
      type: 'action',
      action: result.action,
      message: result.message,
      executionResult: executionResult,
      categories: result.categories
    };

  } catch (error) {
    console.error('[TabAssistant] Error:', error);
    return { type: 'error', content: '处理请求时出错: ' + error.message };
  }
}

