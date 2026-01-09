/**
 * Content Extractor - Runs on all pages to extract content
 */

// Listen for messages from popup/sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
        const content = extractPageContent();
        sendResponse(content);
    }
    return true;
});

/**
 * Extract main content from the page
 */
function extractPageContent() {
    // Try to find main content using common selectors
    const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '.main-content'
    ];

    let content = '';
    let foundElement = null;

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.length > 200) {
            content = element.innerText;
            foundElement = element;
            break;
        }
    }

    // Fallback to body if no content found
    if (!content) {
        content = document.body.innerText;
    }

    // Clean up the content
    content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

    return {
        content: content,
        title: document.title,
        url: window.location.href,
        description: getMetaDescription(),
        author: getMetaAuthor(),
        publishDate: getPublishDate()
    };
}

/**
 * Get meta description
 */
function getMetaDescription() {
    const meta = document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
    return meta ? meta.getAttribute('content') : '';
}

/**
 * Get meta author
 */
function getMetaAuthor() {
    const meta = document.querySelector('meta[name="author"]') ||
        document.querySelector('meta[property="article:author"]');
    return meta ? meta.getAttribute('content') : '';
}

/**
 * Get publish date
 */
function getPublishDate() {
    const meta = document.querySelector('meta[property="article:published_time"]') ||
        document.querySelector('meta[name="publish_date"]');
    return meta ? meta.getAttribute('content') : '';
}

/**
 * Inject summary overlay (optional feature)
 */
function injectSummaryOverlay(summary) {
    // Remove existing overlay if present
    const existing = document.getElementById('ai-summary-overlay');
    if (existing) {
        existing.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'ai-summary-overlay';
    overlay.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    max-width: 400px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.95));
    backdrop-filter: blur(10px);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: slideIn 0.3s ease-out;
  `;

    overlay.innerHTML = `
    <style>
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    </style>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600;">📝 AI摘要</h3>
      <button id="close-summary" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; line-height: 1;">&times;</button>
    </div>
    <p style="margin: 0; font-size: 14px; line-height: 1.6; opacity: 0.95;">${summary}</p>
  `;

    document.body.appendChild(overlay);

    // Add close button handler
    document.getElementById('close-summary').addEventListener('click', () => {
        overlay.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => overlay.remove(), 300);
    });

    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => overlay.remove(), 300);
        }
    }, 30000);
}

// Listen for summary injection requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectSummary') {
        injectSummaryOverlay(request.summary);
        sendResponse({ success: true });
    }
});

console.log('Content extractor loaded');
