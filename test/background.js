// Safari AI Extension - Complete Background Script
console.log('=== Background Script Loading ===');

const browser = window.browser || window.chrome || globalThis.chrome;
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
    const maxTokens = length === 'brief' ? 300 : 800;
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
      
      console.log('[OpenAI] Sending test request...');
      const response = await this.createChatCompletion([
        { role: 'user', content: 'Hello' }
      ], { maxTokens: 10 });
      
      console.log('[OpenAI] Test successful!');
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
    const tabs = await browser.tabs.query({});
    if (tabs.length === 0) return { categories: [] };

    const tabInfo = tabs.map(tab => ({
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
    console.error('Tab categorization error:', error);
    throw error;
  }
}

async function identifyInactiveTabs() {
  try {
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
    console.error('Inactive tab identification error:', error);
    throw error;
  }
}

async function summarizeTab(tabId, length = 'brief') {
  try {
    const currentTabId = tabId || (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    
    if (!currentTabId) {
      throw new Error('No active tab found');
    }

    const results = await browser.scripting.executeScript({
      target: { tabId: currentTabId },
      func: function() {
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
    console.error('Summarization error:', error);
    throw error;
  }
}

async function handleChat(data) {
  try {
    const { messages } = data;
    const response = await openAIClient.createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 2000
    });
    return {
      content: response.choices[0].message.content,
      role: 'assistant'
    };
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

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
        return await summarizeTab(data.tabId, data.length);

      case 'chat':
        return await handleChat(data);

      case 'ping':
        return { pong: true, timestamp: Date.now() };

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
  });
}

console.log('=== Background Script Ready ===');
