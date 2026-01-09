/**
 * Content Summarizer - AI-powered web page summarization
 */

import { openAIClient } from '../api/openai-client.js';
import { PROMPTS } from '../api/prompts.js';
import { Storage } from '../utils/storage.js';

export class ContentSummarizer {
    constructor() {
        this.cacheEnabled = true;
    }

    /**
     * Extract content from current tab
     * @param {number} tabId - Tab ID
     * @returns {Promise<Object>} Extracted content
     */
    async extractContent(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Extract main content using various selectors
                    const selectors = [
                        'article',
                        'main',
                        '[role="main"]',
                        '.content',
                        '.post-content',
                        '.article-content',
                        '#content'
                    ];

                    let content = '';

                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            content = element.innerText;
                            break;
                        }
                    }

                    // Fallback to body if no content found
                    if (!content) {
                        content = document.body.innerText;
                    }

                    return {
                        content: content.trim(),
                        title: document.title,
                        url: window.location.href
                    };
                }
            });

            return results[0].result;
        } catch (error) {
            console.error('Content extraction error:', error);
            throw error;
        }
    }

    /**
     * Generate summary for content
     * @param {string} content - Page content
     * @param {string} url - Page URL
     * @param {string} length - Summary length (brief/detailed)
     * @returns {Promise<string>} Generated summary
     */
    async summarize(content, url, length = 'brief') {
        try {
            // Check cache first
            if (this.cacheEnabled) {
                const cached = await this.getCachedSummary(url, length);
                if (cached) {
                    return cached;
                }
            }

            // Clean content (remove excessive whitespace, etc.)
            const cleanContent = content
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, '\n')
                .trim();

            if (cleanContent.length < 100) {
                return '内容太短，无需摘要';
            }

            const messages = PROMPTS.summarizeContent(cleanContent, url, length);
            const response = await openAIClient.createChatCompletion(messages, {
                temperature: 0.5,
                maxTokens: length === 'brief' ? 300 : 800
            });

            const summary = response.choices[0].message.content.trim();

            // Cache the summary
            if (this.cacheEnabled) {
                await this.cacheSummary(url, length, summary);
            }

            return summary;
        } catch (error) {
            console.error('Summarization error:', error);
            throw error;
        }
    }

    /**
     * Summarize current tab
     * @param {number} tabId - Tab ID (optional, uses active tab if not provided)
     * @param {string} length - Summary length
     * @returns {Promise<Object>} Summary result
     */
    async summarizeTab(tabId = null, length = 'brief') {
        try {
            // Get active tab if no tabId provided
            if (!tabId) {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    throw new Error('No active tab found');
                }
                tabId = tabs[0].id;
            }

            // Extract content
            const extracted = await this.extractContent(tabId);

            // Generate summary
            const summary = await this.summarize(extracted.content, extracted.url, length);

            return {
                title: extracted.title,
                url: extracted.url,
                summary: summary,
                length: length,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Tab summarization error:', error);
            throw error;
        }
    }

    /**
     * Get cached summary
     * @private
     * @param {string} url - Page URL
     * @param {string} length - Summary length
     * @returns {Promise<string|null>} Cached summary or null
     */
    async getCachedSummary(url, length) {
        try {
            const cache = await Storage.get('summariesCache', {});
            const key = `${url}_${length}`;
            const cached = cache[key];

            if (!cached) return null;

            // Check if cache is still valid (24 hours)
            const age = Date.now() - cached.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                return null;
            }

            return cached.summary;
        } catch (error) {
            console.error('Cache retrieval error:', error);
            return null;
        }
    }

    /**
     * Cache summary
     * @private
     * @param {string} url - Page URL
     * @param {string} length - Summary length
     * @param {string} summary - Summary text
     */
    async cacheSummary(url, length, summary) {
        try {
            const cache = await Storage.get('summariesCache', {});
            const key = `${url}_${length}`;

            cache[key] = {
                summary: summary,
                timestamp: Date.now()
            };

            // Limit cache size (keep last 100 summaries)
            const entries = Object.entries(cache);
            if (entries.length > 100) {
                // Sort by timestamp and keep newest 100
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const newCache = Object.fromEntries(entries.slice(0, 100));
                await Storage.set('summariesCache', newCache);
            } else {
                await Storage.set('summariesCache', cache);
            }
        } catch (error) {
            console.error('Cache storage error:', error);
        }
    }

    /**
     * Clear summary cache
     */
    async clearCache() {
        await Storage.set('summariesCache', {});
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache stats
     */
    async getCacheStats() {
        const cache = await Storage.get('summariesCache', {});
        const entries = Object.values(cache);

        return {
            count: entries.length,
            oldestTimestamp: entries.length > 0
                ? Math.min(...entries.map(e => e.timestamp))
                : null,
            newestTimestamp: entries.length > 0
                ? Math.max(...entries.map(e => e.timestamp))
                : null
        };
    }
}

export const contentSummarizer = new ContentSummarizer();
