/**
 * AI Prompts for different features
 */

export const PROMPTS = {
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
