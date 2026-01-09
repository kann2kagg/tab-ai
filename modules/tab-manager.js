/**
 * Tab Manager - Intelligent tab management with AI
 */

import { openAIClient } from '../api/openai-client.js';
import { PROMPTS } from '../api/prompts.js';
import { Storage } from '../utils/storage.js';
import { extractDomain, formatDate } from '../utils/helpers.js';

export class TabManager {
    constructor() {
        this.inactiveThreshold = 30 * 60 * 1000; // 30 minutes default
    }

    /**
     * Get all tabs with metadata
     * @returns {Promise<Array>} Array of tab objects
     */
    async getAllTabs() {
        const tabs = await chrome.tabs.query({});

        return tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            domain: extractDomain(tab.url),
            active: tab.active,
            pinned: tab.pinned,
            lastAccessed: tab.lastAccessed || Date.now()
        }));
    }

    /**
     * Categorize tabs using AI
     * @returns {Promise<Object>} Categorization result
     */
    async categorizeTabs() {
        try {
            const tabs = await this.getAllTabs();

            if (tabs.length === 0) {
                return { groups: [] };
            }

            // Filter out chrome:// and extension pages
            const validTabs = tabs.filter(tab =>
                !tab.url.startsWith('chrome://') &&
                !tab.url.startsWith('chrome-extension://')
            );

            if (validTabs.length === 0) {
                return { groups: [] };
            }

            const messages = PROMPTS.categorizeTabs(validTabs);
            const response = await openAIClient.createChatCompletion(messages, {
                temperature: 0.3,
                maxTokens: 1500
            });

            const content = response.choices[0].message.content;

            // Try to extract JSON from response
            let result;
            try {
                result = JSON.parse(content);
            } catch {
                // Try to extract JSON from markdown code block
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                    content.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[1]);
                } else {
                    throw new Error('Failed to parse AI response');
                }
            }

            return result;
        } catch (error) {
            console.error('Tab categorization error:', error);
            throw error;
        }
    }

    /**
   * Identify inactive tabs
   * @returns {Promise<Array>} Array of inactive tab IDs
   */
    async identifyInactiveTabs() {
        try {
            const tabs = await this.getAllTabs();
            const now = Date.now();

            // Get threshold from settings
            const threshold = await Storage.get('tabInactiveThreshold', 30);
            const thresholdMs = threshold * 60 * 1000;

            // Get keep keywords from settings
            const keepKeywordsStr = await Storage.get('tabKeepKeywords', '');
            const keepKeywords = keepKeywordsStr
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0);

            const inactiveTabs = tabs
                .filter(tab => {
                    const timeSinceAccess = now - tab.lastAccessed;

                    // Skip pinned and active tabs
                    if (tab.pinned || tab.active) {
                        return false;
                    }

                    // Skip tabs that haven't exceeded threshold
                    if (timeSinceAccess <= thresholdMs) {
                        return false;
                    }

                    // Check if tab contains any keep keywords
                    if (keepKeywords.length > 0) {
                        const tabText = `${tab.title} ${tab.url}`.toLowerCase();
                        const hasKeyword = keepKeywords.some(keyword => tabText.includes(keyword));

                        // Skip tabs that contain keep keywords
                        if (hasKeyword) {
                            return false;
                        }
                    }

                    return true;
                })
                .map(tab => ({
                    ...tab,
                    lastAccessed: formatDate(tab.lastAccessed)
                }));

            if (inactiveTabs.length === 0) {
                return [];
            }

            // Use AI to provide better reasons
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
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                    content.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[1]);
                } else {
                    // Fallback to simple list
                    return inactiveTabs.map((tab, i) => ({
                        index: i,
                        tabId: tab.id,
                        title: tab.title,
                        reason: `超过${threshold}分钟未访问`
                    }));
                }
            }

            // Map indices to actual tab IDs
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

    /**
     * Close tabs by IDs
     * @param {Array<number>} tabIds - Array of tab IDs to close
     */
    async closeTabs(tabIds) {
        try {
            await chrome.tabs.remove(tabIds);
        } catch (error) {
            console.error('Close tabs error:', error);
            throw error;
        }
    }

    /**
     * Group tabs by domain
     * @returns {Object} Grouped tabs
     */
    async groupByDomain() {
        const tabs = await this.getAllTabs();
        const grouped = {};

        tabs.forEach(tab => {
            const domain = tab.domain;
            if (!grouped[domain]) {
                grouped[domain] = [];
            }
            grouped[domain].push(tab);
        });

        return grouped;
    }

    /**
     * Search tabs
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching tabs
     */
    async searchTabs(query) {
        const tabs = await this.getAllTabs();
        const lowerQuery = query.toLowerCase();

        return tabs.filter(tab =>
            tab.title.toLowerCase().includes(lowerQuery) ||
            tab.url.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Save current tab session
     * @param {string} name - Session name
     */
    async saveSession(name) {
        try {
            const tabs = await this.getAllTabs();
            const sessions = await Storage.get('tabSessions', {});

            sessions[name] = {
                tabs: tabs.map(t => ({ title: t.title, url: t.url })),
                created: Date.now()
            };

            await Storage.set('tabSessions', sessions);
        } catch (error) {
            console.error('Save session error:', error);
            throw error;
        }
    }

    /**
     * Restore tab session
     * @param {string} name - Session name
     */
    async restoreSession(name) {
        try {
            const sessions = await Storage.get('tabSessions', {});
            const session = sessions[name];

            if (!session) {
                throw new Error('Session not found');
            }

            // Open all tabs from session
            for (const tab of session.tabs) {
                await chrome.tabs.create({ url: tab.url, active: false });
            }
        } catch (error) {
            console.error('Restore session error:', error);
            throw error;
        }
    }

    /**
     * Get saved sessions
     * @returns {Promise<Object>} All saved sessions
     */
    async getSessions() {
        return await Storage.get('tabSessions', {});
    }
}

export const tabManager = new TabManager();
