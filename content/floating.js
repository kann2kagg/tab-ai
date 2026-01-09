/**
 * Floating Ball Content Script
 * Injects a floating button and handles the popup overlay.
 */

// Avoid duplicate injection
if (!document.getElementById('tab-ai-float-btn')) {
    initFloatingUI();
}

function initFloatingUI() {
    // 1. Create Floating Button
    const btn = document.createElement('div');
    btn.id = 'tab-ai-float-btn';
    btn.className = 'tab-ai-float-btn';
    btn.innerHTML = `
        <span class="tab-ai-icon">🤖</span>
        <div class="tab-ai-tooltip">TabAI 助手</div>
    `;

    // 2. Create Iframe Container (Hidden by default)
    const iframe = document.createElement('iframe');
    iframe.id = 'tab-ai-overlay';
    iframe.className = 'tab-ai-iframe-container';
    // Point to the popup.html
    iframe.src = chrome.runtime.getURL('popup/popup.html');
    iframe.allow = "clipboard-write";
    iframe.style.display = 'none'; // Initially hidden

    // 3. Mount to DOM
    document.body.appendChild(btn);
    document.body.appendChild(iframe);

    // 4. Toggle Logic
    let isVisible = false;

    btn.addEventListener('click', (e) => {
        // Critical: Prevent page from stealing the click
        e.stopPropagation();
        e.stopImmediatePropagation();

        isVisible = !isVisible;
        console.log('[TabAI] Toggle visibility:', isVisible);

        if (isVisible) {
            iframe.style.display = 'block';
            // Use timeout to allow display:block to render before adding opacity
            setTimeout(() => {
                iframe.classList.add('visible');
            }, 10);
            btn.innerHTML = `<span class="tab-ai-icon">✕</span>`;
        } else {
            iframe.classList.remove('visible');
            // Wait for transition to finish before hiding
            setTimeout(() => {
                if (!isVisible) iframe.style.display = 'none';
            }, 300);
            btn.innerHTML = `<span class="tab-ai-icon">🤖</span>`;
        }
    });

    // 5. Close when clicking outside
    document.addEventListener('click', (e) => {
        // Only close if we are actually clicking outside the components
        if (isVisible &&
            !btn.contains(e.target) &&
            !iframe.contains(e.target)) {

            console.log('[TabAI] Closing via outside click');
            isVisible = false;
            iframe.classList.remove('visible');
            setTimeout(() => {
                if (!isVisible) iframe.style.display = 'none';
            }, 300);
            btn.innerHTML = `<span class="tab-ai-icon">🤖</span>`;
        }
    });
}
