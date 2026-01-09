/**
 * OpenAI API Client for browser extension
 */

import { Storage } from '../utils/storage.js';

export class OpenAIClient {
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
export const openAIClient = new OpenAIClient();
