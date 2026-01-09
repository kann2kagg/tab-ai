/**
 * Bookmark Classifier - AI-powered bookmark organization
 */

import { openAIClient } from '../api/openai-client.js';
import { PROMPTS } from '../api/prompts.js';

export class BookmarkClassifier {
    /**
     * Get all bookmarks
     * @returns {Promise<Array>} Array of bookmarks
     */
    async getAllBookmarks() {
        const tree = await chrome.bookmarks.getTree();
        const bookmarks = [];

        function traverse(nodes) {
            for (const node of nodes) {
                if (node.url) {
                    bookmarks.push({
                        id: node.id,
                        title: node.title,
                        url: node.url,
                        parentId: node.parentId
                    });
                }
                if (node.children) {
                    traverse(node.children);
                }
            }
        }

        traverse(tree);
        return bookmarks;
    }

    /**
     * Classify a single bookmark
     * @param {Object} bookmark - Bookmark object
     * @returns {Promise<Object>} Classification result
     */
    async classifyBookmark(bookmark) {
        try {
            const messages = PROMPTS.classifyBookmark(bookmark);
            const response = await openAIClient.createChatCompletion(messages, {
                temperature: 0.4,
                maxTokens: 300
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
                    throw new Error('Failed to parse classification result');
                }
            }

            return {
                ...result,
                bookmarkId: bookmark.id
            };
        } catch (error) {
            console.error('Bookmark classification error:', error);
            throw error;
        }
    }

    /**
     * Batch classify bookmarks
     * @param {Array} bookmarks - Array of bookmarks (max 20 at a time)
     * @returns {Promise<Object>} Classification result
     */
    async batchClassifyBookmarks(bookmarks) {
        try {
            if (bookmarks.length === 0) {
                return { folders: [], suggestions: [] };
            }

            // Limit to 20 bookmarks for better AI performance
            const limited = bookmarks.slice(0, 20);

            const messages = PROMPTS.batchClassifyBookmarks(limited);
            const response = await openAIClient.createChatCompletion(messages, {
                temperature: 0.4,
                maxTokens: 2000
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
                    throw new Error('Failed to parse batch classification result');
                }
            }

            // Map indices to actual bookmark IDs
            result.folders = result.folders.map(folder => ({
                ...folder,
                bookmarks: folder.bookmarks.map(idx => limited[idx])
            }));

            return result;
        } catch (error) {
            console.error('Batch bookmark classification error:', error);
            throw error;
        }
    }

    /**
     * Create folder if it doesn't exist
     * @param {string} folderName - Folder name
     * @param {string} parentId - Parent folder ID
     * @returns {Promise<string>} Folder ID
     */
    async createFolder(folderName, parentId = '1') {
        try {
            // Check if folder already exists
            const existing = await chrome.bookmarks.getChildren(parentId);
            const existingFolder = existing.find(
                node => !node.url && node.title === folderName
            );

            if (existingFolder) {
                return existingFolder.id;
            }

            // Create new folder
            const folder = await chrome.bookmarks.create({
                parentId: parentId,
                title: folderName
            });

            return folder.id;
        } catch (error) {
            console.error('Create folder error:', error);
            throw error;
        }
    }

    /**
     * Move bookmark to folder
     * @param {string} bookmarkId - Bookmark ID
     * @param {string} folderId - Target folder ID
     */
    async moveBookmark(bookmarkId, folderId) {
        try {
            await chrome.bookmarks.move(bookmarkId, { parentId: folderId });
        } catch (error) {
            console.error('Move bookmark error:', error);
            throw error;
        }
    }

    /**
     * Organize bookmarks based on AI classification
     * @param {Object} classification - Classification result from batchClassifyBookmarks
     */
    async organizeBookmarks(classification) {
        try {
            for (const folder of classification.folders) {
                // Create folder
                const folderId = await this.createFolder(folder.name);

                // Move bookmarks to folder
                for (const bookmark of folder.bookmarks) {
                    await this.moveBookmark(bookmark.id, folderId);
                }
            }
        } catch (error) {
            console.error('Organize bookmarks error:', error);
            throw error;
        }
    }

    /**
     * Find duplicate bookmarks
     * @returns {Promise<Array>} Array of duplicate groups
     */
    async findDuplicates() {
        const bookmarks = await this.getAllBookmarks();
        const urlMap = {};

        // Group by URL
        bookmarks.forEach(bookmark => {
            if (!urlMap[bookmark.url]) {
                urlMap[bookmark.url] = [];
            }
            urlMap[bookmark.url].push(bookmark);
        });

        // Filter duplicates
        const duplicates = Object.entries(urlMap)
            .filter(([url, bookmarks]) => bookmarks.length > 1)
            .map(([url, bookmarks]) => ({
                url,
                count: bookmarks.length,
                bookmarks
            }));

        return duplicates;
    }

    /**
     * Remove duplicate bookmarks (keep first one)
     * @param {Array} duplicates - Array of duplicate groups
     */
    async removeDuplicates(duplicates) {
        try {
            for (const group of duplicates) {
                // Keep the first bookmark, remove others
                for (let i = 1; i < group.bookmarks.length; i++) {
                    await chrome.bookmarks.remove(group.bookmarks[i].id);
                }
            }
        } catch (error) {
            console.error('Remove duplicates error:', error);
            throw error;
        }
    }

    /**
     * Get bookmark folders
     * @returns {Promise<Array>} Array of folders
     */
    async getFolders() {
        const tree = await chrome.bookmarks.getTree();
        const folders = [];

        function traverse(nodes) {
            for (const node of nodes) {
                if (!node.url && node.id !== '0') {
                    folders.push({
                        id: node.id,
                        title: node.title,
                        parentId: node.parentId
                    });
                }
                if (node.children) {
                    traverse(node.children);
                }
            }
        }

        traverse(tree);
        return folders;
    }
}

export const bookmarkClassifier = new BookmarkClassifier();
