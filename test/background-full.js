// ============================================
// Safari AI Extension - Complete Background Script
// ============================================

console.log('=== Background Script Loading ===');

// Browser API compatibility
const browser = window.browser || window.chrome || globalThis.chrome;

console.log('[Background] Browser API:', !!browser);

// ============================================
// HELPERS
// ============================================
/**
 * Helper utility functions
 */

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */

    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (error) {
        return '';
    }
}

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */

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

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */

    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */

    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */

    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */

    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Group array items by a key function
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Function to extract group key
 * @returns {Object} Grouped object
 */

    return array.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {});
}

/**
 * Calculate time spent (in minutes) between two timestamps
 * @param {number} start - Start timestamp
 * @param {number} end - End timestamp
 * @returns {number} Minutes
 */

    return Math.round((end - start) / 60000);
}

/**
 * Check if URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean}
 */

    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract clean title from page title
 * @param {string} title - Page title
 * @returns {string} Clean title
 */

    // Remove common suffixes
    return title
        .replace(/\s*[-|–]\s*.*$/, '')
        .trim();
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */

    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */

    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

// ============================================
// STORAGE
// ============================================
/**
 * Storage utility for managing extension settings and data
 */

// Browser API compatibility
const browser = window.browser || window.chrome || globalThis.chrome;


  /**
   * Get browser storage API
   * @private
   */
  static getStorageAPI() {
    // Try different browser storage APIs
    if (typeof browser !== 'undefined' && browser.storage) {
      return browser.storage.local;
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return chrome.storage.local;
    }
    // Safari might use different structure
    if (typeof window !== 'undefined' && window.browser?.storage?.local) {
      return window.browser.storage.local;
    }
    throw new Error('Browser storage API not available. Make sure you are accessing this from the extension context.');
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {Promise<*>} The stored value
   */
  static async get(key, defaultValue = null) {
    try {
      const storage = this.getStorageAPI();
      const result = await storage.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    try {
      const storage = this.getStorageAPI();
      await storage.set({ [key]: value });
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  }

  /**
   * Get multiple values from storage
   * @param {Object} defaults - Object with key-default value pairs
   * @returns {Promise<Object>} Object with stored values
   */
  static async getMultiple(defaults) {
    try {
      const storage = this.getStorageAPI();
      const keys = Object.keys(defaults);
      const result = await storage.get(keys);

      // Merge with defaults
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
  }

  /**
   * Set multiple values in storage
   * @param {Object} items - Object with key-value pairs
   * @returns {Promise<void>}
   */
  static async setMultiple(items) {
    try {
      const storage = this.getStorageAPI();
      await storage.set(items);
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      throw error;
    }
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    try {
      const storage = this.getStorageAPI();
      await storage.remove(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  static async clear() {
    try {
      const storage = this.getStorageAPI();
      await storage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }

  /**
   * Get API configuration
   * @returns {Promise<Object>} API config object
   */
  static async getApiConfig() {
    return await this.getMultiple({
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      apiModel: 'gpt-3.5-turbo'
    });
  }

  /**
   * Save API configuration
   * @param {Object} config - API configuration
   * @returns {Promise<void>}
   */
  static async saveApiConfig(config) {
    await this.setMultiple(config);
  }

  /**
   * Check if API is configured
   * @returns {Promise<boolean>}
   */
  static async isApiConfigured() {
    const config = await this.getApiConfig();
    return !!config.apiKey && config.apiKey.length > 0;
  }
}

// Settings keys constants

  API_BASE_URL: 'apiBaseUrl',
  API_KEY: 'apiKey',
  API_MODEL: 'apiModel',
  TAB_INACTIVE_THRESHOLD: 'tabInactiveThreshold',
  AUTO_SUMMARIZE: 'autoSummarize',
  AUTO_CLASSIFY_BOOKMARKS: 'autoClassifyBookmarks',
  HISTORY_ANALYSIS_ENABLED: 'historyAnalysisEnabled',
  SUMMARIES_CACHE: 'summariesCache',
  CHAT_HISTORY: 'chatHistory',
  LAST_ANALYSIS_TIME: 'lastAnalysisTime'
};

// ============================================
// PROMPTS
// ============================================
/**
 * AI Prompts for different features
 */


    /**
     * Tab categorization prompt
     * @param {Array} tabs - Array of tab objects with title and url
     * @returns {Array} Chat messages
     */
    categorizeTabs(tabs) {
        const tabList = tabs.map((tab, i) =>
            `${i + 1}. ${tab.title} - ${tab.url}`
        ).join('\n');

        return [
            {
                role: 'system',
                content: '你是一个智能浏览器助手，擅长分析和分类标签页。请根据内容主题将标签页分组。'
            },
            {
                role: 'user',
                content: `请分析以下标签页，并将它们按主题分组。为每组提供一个描述性的类别名称。

标签页列表：
${tabList}

请以JSON格式返回结果，格式如下：
{
  "groups": [
    {
      "category": "类别名称",
      "tabs": [索引号数组],
      "reason": "分类原因"
    }
  ]
}

只返回JSON，不要其他文字说明。`
            }
        ];
    },

    /**
     * Identify inactive tabs
     * @param {Array} tabs - Array of tab objects
     * @returns {Array} Chat messages
     */
    identifyInactiveTabs(tabs) {
        const tabList = tabs.map((tab, i) =>
            `${i + 1}. ${tab.title} (最后访问: ${tab.lastAccessed})`
        ).join('\n');

        return [
            {
                role: 'system',
                content: '你是一个智能浏览器助手，帮助用户管理标签页。识别那些可能不再需要的标签页。'
            },
            {
                role: 'user',
                content: `请分析以下标签页，识别哪些可能已经不再需要（如长时间未访问、一次性阅读内容等）：

${tabList}

返回JSON格式：
{
  "inactive": [
    {
      "index": 索引号,
      "reason": "可以关闭的原因"
    }
  ]
}

只返回JSON。`
            }
        ];
    },

    /**
     * Summarize web content
     * @param {string} content - Page content
     * @param {string} url - Page URL
     * @param {string} length - Summary length (brief/detailed)
     * @returns {Array} Chat messages
     */
    summarizeContent(content, url, length = 'brief') {
        const maxLength = length === 'brief' ? '3-5句话' : '10-15句话';

        return [
            {
                role: 'system',
                content: '你是一个专业的内容摘要助手，能够快速提取网页核心信息。'
            },
            {
                role: 'user',
                content: `请为以下网页内容生成一个${maxLength}的简洁摘要，突出关键信息和要点：

网址：${url}

内容：
${content.substring(0, 8000)}

请用中文返回摘要，格式清晰，突出要点。`
            }
        ];
    },

    /**
     * Classify bookmark
     * @param {Object} bookmark - Bookmark object
     * @returns {Array} Chat messages
     */
    classifyBookmark(bookmark) {
        return [
            {
                role: 'system',
                content: '你是一个智能书签分类助手，根据书签的标题和URL推荐合适的分类和标签。'
            },
            {
                role: 'user',
                content: `请为以下书签推荐分类和标签：

标题：${bookmark.title}
网址：${bookmark.url}

返回JSON格式：
{
  "category": "推荐的文件夹名称",
  "tags": ["标签1", "标签2", "标签3"],
  "description": "简短描述"
}

只返回JSON。`
            }
        ];
    },

    /**
     * Batch classify bookmarks
     * @param {Array} bookmarks - Array of bookmarks
     * @returns {Array} Chat messages
     */
    batchClassifyBookmarks(bookmarks) {
        const bookmarkList = bookmarks.map((b, i) =>
            `${i + 1}. ${b.title} - ${b.url}`
        ).join('\n');

        return [
            {
                role: 'system',
                content: '你是一个智能书签管理助手，帮助用户整理和分类书签。'
            },
            {
                role: 'user',
                content: `请分析以下书签，提出整理建议，包括文件夹结构和分类方案：

${bookmarkList}

返回JSON格式：
{
  "folders": [
    {
      "name": "文件夹名称",
      "bookmarks": [索引号数组],
      "description": "分类说明"
    }
  ],
  "suggestions": ["整理建议1", "整理建议2"]
}

只返回JSON。`
            }
        ];
    },

    /**
     * Analyze browsing history
     * @param {Array} history - Array of history items
     * @returns {Array} Chat messages
     */
    analyzeHistory(history) {
        const historyList = history.map(h =>
            `${h.title} (${h.url}) - 访问${h.visitCount}次，总时长${h.totalTime}分钟`
        ).join('\n');

        return [
            {
                role: 'system',
                content: '你是一个浏览行为分析助手，帮助用户了解自己的浏览习惯并提供改进建议。'
            },
            {
                role: 'user',
                content: `请分析以下浏览历史数据，提供洞察和建议：

${historyList}

返回JSON格式：
{
  "insights": {
    "topCategories": ["类别1", "类别2"],
    "timeDistribution": {"工作": 60, "娱乐": 30, "学习": 10},
    "productivityScore": 75
  },
  "recommendations": [
    "建议1",
    "建议2"
  ],
  "patterns": [
    "发现的行为模式"
  ]
}

只返回JSON。`
            }
        ];
    },

    /**
     * Chat with context
     * @param {string} userMessage - User's message
     * @param {string} pageContent - Current page content (optional)
     * @param {Array} chatHistory - Previous messages
     * @returns {Array} Chat messages
     */
    chat(userMessage, pageContent = null, chatHistory = []) {
        const messages = [
            {
                role: 'system',
                content: '你是一个智能浏览器助手，可以帮助用户理解网页内容、回答问题、提供建议。你的回答应该简洁、准确、有帮助。'
            }
        ];

        // Add chat history
        messages.push(...chatHistory);

        // Add page context if available
        if (pageContent) {
            messages.push({
                role: 'system',
                content: `当前页面内容摘要：\n${pageContent.substring(0, 2000)}`
            });
        }

        // Add user message
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }
};

// ============================================
// OPENAI_CLIENT
// ============================================
/**
 * OpenAI API Client for browser extension
 */



    constructor() {
        this.baseUrl = null;
        this.apiKey = null;
        this.model = null;
        this.initialized = false;
    }

    /**
     * Initialize client with API configuration
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            const config = await Storage.getApiConfig();

            if (!config.apiKey) {
                console.warn('API key not configured');
                return false;
            }

            this.baseUrl = config.apiBaseUrl || 'https://api.openai.com/v1';
            this.apiKey = config.apiKey;
            this.model = config.apiModel || 'gpt-3.5-turbo';
            this.initialized = true;

            return true;
        } catch (error) {
            console.error('Failed to initialize OpenAI client:', error);
            return false;
        }
    }

    /**
     * Ensure client is initialized
     * @private
     */
    async ensureInitialized() {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('OpenAI client not configured. Please set API key in settings.');
            }
        }
    }

    /**
     * Create chat completion
     * @param {Array} messages - Chat messages
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} API response
     */
    async createChatCompletion(messages, options = {}) {
        await this.ensureInitialized();

        const {
            temperature = 0.7,
            maxTokens = 2000,
            stream = false
        } = options;

        const requestBody = {
            model: this.model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: stream
        };

        try {
            const response = await this.makeRequest('/chat/completions', requestBody);

            if (stream) {
                return response; // Return raw response for streaming
            }

            return response;
        } catch (error) {
            console.error('Chat completion error:', error);
            throw error;
        }
    }

    /**
     * Create streaming chat completion
     * @param {Array} messages - Chat messages
     * @param {Function} onChunk - Callback for each chunk
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Complete response text
     */
    async createStreamingChatCompletion(messages, onChunk, options = {}) {
        await this.ensureInitialized();

        const {
            temperature = 0.7,
            maxTokens = 2000
        } = options;

        const requestBody = {
            model: this.model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: true
        };

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;

                            if (content) {
                                fullText += content;
                                if (onChunk) {
                                    onChunk(content);
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            return fullText;
        } catch (error) {
            console.error('Streaming chat completion error:', error);
            throw error;
        }
    }

    /**
     * Make API request with retry logic
     * @private
     * @param {string} endpoint - API endpoint
     * @param {Object} body - Request body
     * @param {number} retries - Number of retries
     * @returns {Promise<Object>} API response
     */
    async makeRequest(endpoint, body, retries = 3) {
        const url = `${this.baseUrl}${endpoint}`;

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errorData = await response.json();

                    // Don't retry client errors (4xx)
                    if (response.status >= 400 && response.status < 500) {
                        throw new Error(errorData.error?.message || `API error: ${response.status}`);
                    }

                    // Retry server errors (5xx)
                    if (i < retries - 1) {
                        await this.sleep(1000 * (i + 1)); // Exponential backoff
                        continue;
                    }

                    throw new Error(errorData.error?.message || `API error: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                if (i === retries - 1) {
                    throw error;
                }
                await this.sleep(1000 * (i + 1));
            }
        }
    }

    /**
     * Sleep helper
     * @private
     * @param {number} ms - Milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
   * Test API connection
   * @returns {Promise<Object>} Test result
   */
    async testConnection() {
        console.log('[OpenAI Client] Starting connection test...');

        try {
            // Force re-initialization to get latest settings
            this.initialized = false;

            console.log('[OpenAI Client] Loading API configuration...');
            const success = await this.initialize();

            if (!success) {
                return {
                    success: false,
                    message: 'API密钥未配置或无效'
                };
            }

            console.log('[OpenAI Client] Config loaded:', {
                baseUrl: this.baseUrl,
                model: this.model,
                hasApiKey: !!this.apiKey
            });

            console.log('[OpenAI Client] Sending test request...');
            const response = await this.createChatCompletion([
                { role: 'user', content: 'Hello' }
            ], { maxTokens: 10 });

            console.log('[OpenAI Client] Test successful!', response);

            return {
                success: true,
                message: 'API连接成功',
                model: this.model
            };
        } catch (error) {
            console.error('[OpenAI Client] Test failed:', error);

            return {
                success: false,
                message: error.message || '连接失败'
            };
        }
    }
}

// Create singleton instance

const openAIClient = new OpenAIClient();

console.log('[Background] OpenAI client initialized');

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(request, sender) {
  const { action, data } = request;
  console.log(`[Background] Handling action: ${action}`);

  try {
    switch (action) {
      // API Configuration
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

      // Tab Management (simplified - core functionality)
      case 'categorizeTabs':
        return await categorizeTabs();

      case 'identifyInactiveTabs':
        return await identifyInactiveTabs();
      
      case 'closeTabs':
        if (data && data.tabIds) {
          await Promise.all(data.tabIds.map(id => browser.tabs.remove(id)));
        }
        return { success: true };

      // Content Summarization
      case 'summarizeTab':
        return await summarizeTab(data.tabId, data.length);

      // AI Chat
      case 'chat':
        return await handleChat(data);

      // Ping test
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
// TAB MANAGEMENT FUNCTIONS
// ============================================

async function categorizeTabs() {
  try {
    const tabs = await browser.tabs.query({});
    
    if (tabs.length === 0) {
      return { categories: [] };
    }

    await openAIClient.ensureInitialized();

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

    if (inactiveTabs.length === 0) {
      return [];
    }

    await openAIClient.ensureInitialized();

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

// ============================================
// CONTENT SUMMARIZATION
// ============================================

async function summarizeTab(tabId, length = 'brief') {
  try {
    const currentTabId = tabId || (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    
    if (!currentTabId) {
      throw new Error('No active tab found');
    }

    const results = await browser.scripting.executeScript({
      target: { tabId: currentTabId },
      func: extractPageContent
    });

    const content = results[0]?.result;
    
    if (!content || !content.text) {
      throw new Error('Failed to extract page content');
    }

    await openAIClient.ensureInitialized();

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

// Content extraction function (injected into page)
function extractPageContent() {
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '.content'
  ];

  let mainContent = null;
  for (const selector of selectors) {
    mainContent = document.querySelector(selector);
    if (mainContent) break;
  }

  const textContent = mainContent ? mainContent.innerText : document.body.innerText;
  
  const title = document.title || '';
  const url = window.location.href || '';
  
  const metaDesc = document.querySelector('meta[name="description"]');
  const description = metaDesc ? metaDesc.content : '';

  return {
    text: textContent.slice(0, 8000),
    title,
    url,
    description
  };
}

// ============================================
// AI CHAT
// ============================================

async function handleChat(data) {
  try {
    const { messages } = data;

    await openAIClient.ensureInitialized();

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
// EVENT LISTENERS
// ============================================

// Message listener
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

// Installation handler
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
