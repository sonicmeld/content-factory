// Companion Extension - ChatGPT Content Script (Stub)
// Executes DOM automation on ChatGPT interface

console.log("[Companion] ChatGPT content script loaded");

// Prevent duplicate injection
if (!window.__COMPANION_CHATGPT_LOADED__) {
  window.__COMPANION_CHATGPT_LOADED__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PING') {
      sendResponse({ status: 'success', pong: true });
      return true;
    }

    if (message.action === 'PROCESS_PROMPT') {
      // Stub execution
      console.log("[Companion] Received prompt execution for ChatGPT:", message.payload.prompt);
      sendResponse({ status: 'success', message: 'ChatGPT automation executed (Stub)' });
      return true;
    }
  });
}
