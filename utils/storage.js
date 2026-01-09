/**
 * Storage utility for managing extension settings and data
 */

// Browser API compatibility
const browser = window.browser || window.chrome || globalThis.chrome;

export class Storage {
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
export const SETTINGS_KEYS = {
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
