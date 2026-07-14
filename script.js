// ============================================================
// DOM ELEMENTS & CONVERSATION STATE
// ============================================================
const chatWidget = document.getElementById('chatWidget');
const mainWrapper = document.getElementById('mainWrapper');
const logContainer = document.getElementById('log');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const quickPrompts = document.getElementById('quickPrompts');
const chatForm = document.getElementById('chatForm');
const newChatBtn = document.getElementById('newChatBtn');
const chatTabs = document.getElementById('chatTabs');

const GREETING_TEXT = 'What can I help you with today?';

// Each conversation keeps its own rendered message log (for tab switching)
// and its own API-facing history (so context never bleeds between chats)
let conversations = [
    { id: 1, title: 'Chat 1', messages: [{ sender: 'bot', text: GREETING_TEXT }], history: [] }
];
let activeConversationId = 1;
let conversationCounter = 1;

// Maintain conversation history for multi-turn AI context
// (kept as a live pointer to the active conversation's history array)
let chatHistory = conversations[0].history;

// ============================================================
// MOBILE NAV TOGGLE
// ============================================================
const navToggle = document.getElementById('navToggle');
const navClass = document.getElementById('navClass');

if (navToggle && navClass) {
    navToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = navClass.classList.toggle('open');
        navToggle.classList.toggle('open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the menu once a link is tapped
    navClass.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navClass.classList.remove('open');
            navToggle.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Don't let clicks inside the nav bubble up and close the chat-expand logic
    navClass.addEventListener('click', (event) => event.stopPropagation());
}

// ============================================================
// LAYOUT EXPANSION LOGIC
// ============================================================

if (chatWidget) {
    chatWidget.addEventListener('click', (event) => {
        if (mainWrapper) mainWrapper.classList.add('expanded');
        event.stopPropagation();
    });
}

document.addEventListener('click', () => {
    if (mainWrapper) mainWrapper.classList.remove('expanded');
});

const wireInput = document.querySelector('.wire-input');
if (wireInput) {
    wireInput.addEventListener('click', (event) => event.stopPropagation());
}

if (quickPrompts) {
    quickPrompts.addEventListener('click', (event) => event.stopPropagation());
}

if (chatTabs) {
    chatTabs.addEventListener('click', (event) => event.stopPropagation());
}

// Announcement Bar Dismiss
const announceClose = document.getElementById('announce-close');
if (announceClose) {
    announceClose.addEventListener('click', () => {
        const announce = document.getElementById('announce');
        if (announce) announce.style.display = 'none';
    });
}

// ============================================================
// CHAT UI & FORMATTING HELPERS
// ============================================================

function scrollToBottom() {
    if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

function formatMessage(text) {
    let formatted = text.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
}

function appendMessage(sender, text, record = true) {
    if (!logContainer) return;
    const safeText = formatMessage(text);

    if (sender === 'user') {
        const userHtml = `
            <div class="msg user">
                <span class="meta">You</span>
                ${safeText}
            </div>`;
        logContainer.insertAdjacentHTML('beforeend', userHtml);
    } else if (sender === 'bot') {
        const botHtml = `
            <div class="bot-msg-row">
                <img class="bot-profile-pic" src="logo.png" alt="Soil Bot Profile Picture">
                <div class="msg bot">
                    <span class="meta">Soil Bot</span>
                    ${safeText}
                </div>
            </div>`;
        logContainer.insertAdjacentHTML('beforeend', botHtml);
    }

    // Track the message on its conversation so tabs can be rebuilt on switch
    if (record) {
        const conv = getActiveConversation();
        if (conv) {
            const isFirstUserMessage = sender === 'user' && !conv.messages.some((m) => m.sender === 'user');
            conv.messages.push({ sender, text });
            if (isFirstUserMessage) {
                conv.title = truncateTitle(text);
                renderChatTabs();
            }
        }
    }

    scrollToBottom();
}

function toggleTypingIndicator(show) {
    if (!logContainer) return;
    const existingIndicator = document.getElementById('typingIndicator');

    if (show && !existingIndicator) {
        const typingHtml = `
            <div class="typing" id="typingIndicator">
                <span></span><span></span><span></span>
            </div>`;
        logContainer.insertAdjacentHTML('beforeend', typingHtml);
        scrollToBottom();
    } else if (!show && existingIndicator) {
        existingIndicator.remove();
    }
}

// ============================================================
// API COMMUNICATION & EVENT HANDLERS
// ============================================================

async function handleSendMessage() {
    if (!userInput) return;
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Render message & clear input
    appendMessage('user', text);
    userInput.value = '';

    // 2. Disable input elements during API request
    userInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    // 3. Update history & display typing indicator
    chatHistory.push({ role: "user", content: text });
    toggleTypingIndicator(true);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ history: chatHistory })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        toggleTypingIndicator(false);

        if (data.response) {
            appendMessage('bot', data.response);
            chatHistory.push({ role: "assistant", content: data.response });
        } else {
            appendMessage('bot', "System Error: Received an invalid response structure from the server.");
        }

    } catch (error) {
        toggleTypingIndicator(false);
        appendMessage('bot', "Connection Error: Please verify if app.py is running on port 5000.");
        console.error("Backend request failed:", error);
    } finally {
        // Re-enable UI controls
        userInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        userInput.focus();
    }
}

// Attach Form Submit Listener
if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSendMessage();
    });
}

// Attach Quick Prompt Chips Listener
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (userInput) {
            userInput.value = chip.getAttribute('data-query');
            handleSendMessage();
        }
    });
});

// ============================================================
// MULTI-CONVERSATION MANAGEMENT (New Chat + Tabs)
// ============================================================

function getActiveConversation() {
    return conversations.find((c) => c.id === activeConversationId) || null;
}

function truncateTitle(text, maxLen = 22) {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen - 1).trimEnd() + '…';
}

function renderChatTabs() {
    if (!chatTabs) return;

    chatTabs.innerHTML = '';
    conversations.forEach((conv) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'chat-tab' + (conv.id === activeConversationId ? ' active' : '');
        tab.textContent = conv.title;
        tab.title = conv.title;
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            switchConversation(conv.id);
        });
        chatTabs.appendChild(tab);
    });

    // The bar only reveals itself once there's somewhere to navigate to
    chatTabs.classList.toggle('visible', conversations.length > 1);
}

function switchConversation(id) {
    if (id === activeConversationId) return;
    const conv = conversations.find((c) => c.id === id);
    if (!conv || !logContainer) return;

    activeConversationId = id;
    chatHistory = conv.history;

    logContainer.innerHTML = '';
    conv.messages.forEach((m) => appendMessage(m.sender, m.text, false));

    renderChatTabs();
    scrollToBottom();
}

function createNewConversation() {
    conversationCounter += 1;
    const newConv = {
        id: conversationCounter,
        title: `Chat ${conversationCounter}`,
        messages: [{ sender: 'bot', text: GREETING_TEXT }],
        history: []
    };
    conversations.push(newConv);
    switchConversation(newConv.id);
}

if (newChatBtn) {
    newChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        createNewConversation();
    });
}

// ============================================================
// BEFORE VS AFTER IMPACT SWITCHER
// ============================================================
function animateBars(viewEl) {
    if (!viewEl) return;
    const bars = viewEl.querySelectorAll('.bar-fill');
    bars.forEach((bar, i) => {
        bar.style.width = '0%';
        window.setTimeout(() => {
            bar.style.width = (bar.getAttribute('data-width') || 0) + '%';
        }, 60 + i * 90);
    });
}

function switchImpact(state) {
    const btnBefore = document.getElementById('btnBefore');
    const btnAfter = document.getElementById('btnAfter');
    const viewBefore = document.getElementById('viewBefore');
    const viewAfter = document.getElementById('viewAfter');
    const slider = document.getElementById('toggleSlider');

    if (!btnBefore || !btnAfter || !viewBefore || !viewAfter || !slider) return;

    if (state === 'after') {
        btnBefore.classList.remove('active');
        btnAfter.classList.add('active');
        viewBefore.classList.remove('active');
        viewAfter.classList.add('active');
        slider.classList.add('slide-right');
        animateBars(viewAfter);
    } else {
        btnAfter.classList.remove('active');
        btnBefore.classList.add('active');
        viewAfter.classList.remove('active');
        viewBefore.classList.add('active');
        slider.classList.remove('slide-right');
        animateBars(viewBefore);
    }
}

// ============================================================
// SCROLL-REVEAL ANIMATION (content sections, cards, figures)
// ============================================================
const revealTargets = document.querySelectorAll('.reveal');

if (revealTargets.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((el) => revealObserver.observe(el));
} else {
    // Fallback: no IntersectionObserver support, just show everything
    revealTargets.forEach((el) => el.classList.add('in-view'));
}

// Fill the impact bars once on load, matching whichever toggle starts active
window.setTimeout(() => {
    animateBars(document.querySelector('.impact-view.active'));
}, 350);

// ============================================================
// RESEARCH FIGURE LIGHTBOX
// ============================================================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose = document.getElementById('lightboxClose');

function openLightbox(imgEl, captionText) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = imgEl.src;
    lightboxImg.alt = imgEl.alt || '';
    if (lightboxCaption) lightboxCaption.textContent = captionText || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
}

document.querySelectorAll('.research-card').forEach((card) => {
    const img = card.querySelector('img');
    const caption = card.querySelector('figcaption p');
    const trigger = () => openLightbox(img, caption ? caption.textContent : '');

    card.addEventListener('click', trigger);
    card.querySelector('.research-img-wrap')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            trigger();
        }
    });
});

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) {
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});