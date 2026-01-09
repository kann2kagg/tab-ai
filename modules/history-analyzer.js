/**
 * History Analyzer - AI-powered browsing history analysis
 */

import { openAIClient } from '../api/openai-client.js';
import { PROMPTS } from '../api/prompts.js';
import { Storage } from '../utils/storage.js';
import { extractDomain, calculateTimeSpent } from '../utils/helpers.js';

export class HistoryAnalyzer {
    /**
     * Get browsing history for a time period
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>} History items
     */
    async getHistory(days = 7) {
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);

        const historyItems = await chrome.history.search({
            text: '',
            startTime: startTime,
            endTime: endTime,
            maxResults: 1000
        });

        return historyItems;
    }

    /**
     * Aggregate history data
     * @param {Array} historyItems - Raw history items
     * @returns {Array} Aggregated data
     */
    aggregateHistory(historyItems) {
        const aggregated = {};

        historyItems.forEach(item => {
            const domain = extractDomain(item.url);

            if (!aggregated[domain]) {
                aggregated[domain] = {
                    domain,
                    title: item.title,
                    url: item.url,
                    visitCount: 0,
                    totalTime: 0,
                    lastVisit: 0
                };
            }

            aggregated[domain].visitCount += item.visitCount || 1;
            aggregated[domain].lastVisit = Math.max(
                aggregated[domain].lastVisit,
                item.lastVisitTime || 0
            );

            // Estimate time spent (this is approximate)
            // Assume average 5 minutes per visit
            aggregated[domain].totalTime += (item.visitCount || 1) * 5;
        });

        return Object.values(aggregated)
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, 30); // Top 30 sites
    }

    /**
     * Analyze browsing patterns using AI
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeHistory(days = 7) {
        try {
            const historyItems = await this.getHistory(days);

            if (historyItems.length === 0) {
                return {
                    insights: {
                        topCategories: [],
                        timeDistribution: {},
                        productivityScore: 0
                    },
                    recommendations: ['浏览历史数据不足，无法分析'],
                    patterns: []
                };
            }

            const aggregated = this.aggregateHistory(historyItems);

            const messages = PROMPTS.analyzeHistory(aggregated);
            const response = await openAIClient.createChatCompletion(messages, {
                temperature: 0.4,
                maxTokens: 1500
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
                    throw new Error('Failed to parse analysis result');
                }
            }

            // Add raw data
            result.topSites = aggregated.slice(0, 10);
            result.totalSites = aggregated.length;
            result.period = days;

            // Save analysis
            await Storage.set('lastAnalysisTime', Date.now());
            await Storage.set('lastAnalysisResult', result);

            return result;
        } catch (error) {
            console.error('History analysis error:', error);
            throw error;
        }
    }

    /**
     * Get last analysis result
     * @returns {Promise<Object|null>} Last analysis or null
     */
    async getLastAnalysis() {
        const result = await Storage.get('lastAnalysisResult', null);
        const time = await Storage.get('lastAnalysisTime', null);

        if (!result || !time) {
            return null;
        }

        // Check if analysis is still fresh (24 hours)
        const age = Date.now() - time;
        if (age > 24 * 60 * 60 * 1000) {
            return null;
        }

        return {
            ...result,
            analysisTime: time
        };
    }

    /**
     * Get browsing statistics
     * @param {number} days - Number of days
     * @returns {Promise<Object>} Statistics
     */
    async getStatistics(days = 7) {
        const historyItems = await this.getHistory(days);
        const aggregated = this.aggregateHistory(historyItems);

        const totalVisits = aggregated.reduce((sum, item) => sum + item.visitCount, 0);
        const totalTime = aggregated.reduce((sum, item) => sum + item.totalTime, 0);
        const uniqueSites = aggregated.length;

        return {
            totalVisits,
            totalTime,
            uniqueSites,
            avgVisitsPerDay: Math.round(totalVisits / days),
            avgTimePerDay: Math.round(totalTime / days),
            topSites: aggregated.slice(0, 10)
        };
    }

    /**
     * Search history
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum results
     * @returns {Promise<Array>} Search results
     */
    async searchHistory(query, maxResults = 50) {
        const results = await chrome.history.search({
            text: query,
            maxResults: maxResults
        });

        return results.map(item => ({
            title: item.title,
            url: item.url,
            visitCount: item.visitCount,
            lastVisit: item.lastVisitTime
        }));
    }

    /**
     * Get visit counts by time of day
     * @param {number} days - Number of days
     * @returns {Promise<Object>} Time distribution
     */
    async getTimeDistribution(days = 7) {
        const historyItems = await this.getHistory(days);
        const distribution = {
            morning: 0,    // 6-12
            afternoon: 0,  // 12-18
            evening: 0,    // 18-24
            night: 0       // 0-6
        };

        historyItems.forEach(item => {
            const date = new Date(item.lastVisitTime);
            const hour = date.getHours();

            if (hour >= 6 && hour < 12) {
                distribution.morning++;
            } else if (hour >= 12 && hour < 18) {
                distribution.afternoon++;
            } else if (hour >= 18 && hour < 24) {
                distribution.evening++;
            } else {
                distribution.night++;
            }
        });

        return distribution;
    }

    /**
     * Clear browsing history
     * @param {number} days - Number of days to clear (0 = all)
     */
    async clearHistory(days = 0) {
        try {
            const endTime = Date.now();
            const startTime = days > 0 ? endTime - (days * 24 * 60 * 60 * 1000) : 0;

            await chrome.browsingData.removeHistory({
                since: startTime
            });
        } catch (error) {
            console.error('Clear history error:', error);
            throw error;
        }
    }
}

export const historyAnalyzer = new HistoryAnalyzer();
