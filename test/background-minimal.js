console.log('=== Background Script Loading ===');

const browser = window.browser || window.chrome;

console.log('[Background] Browser API:', !!browser);

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

  async testConnection() {
    console.log('[OpenAI] Testing connection...');
    
    try {
      // 强制重新加载配置
      this.initialized = false;
      const success = await this.initialize();
      
      if (!success) {
        return { 
          success: false, 
          message: 'API密钥未配置' 
        };
      }
      
      console.log('[OpenAI] Sending test request to:', this.baseUrl);
      
      // 调用API
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
