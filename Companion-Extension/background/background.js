// Companion Extension - Background Service Worker
// Manages background automation tasks, Low-level CDP Clicks, and file download/upload routing

import { ClientManager } from '../core/client-manager.js';
import { UploadClient } from '../core/upload-client.js';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[Companion] SidePanel error:", error));

// Handle native clicks via Chrome DevTools Protocol (CDP)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CDP_CLICK') {
    const tabId = message.tabId || sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'No active tab ID found' });
      return true;
    }
    const { x, y } = message;
    const debuggee = { tabId };

    (async () => {
      try {
        await chrome.debugger.attach(debuggee, '1.3');
        await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
          type: 'mousePressed', x, y, button: 'left', clickCount: 1
        });
        await new Promise(r => setTimeout(r, 50));
        await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
          type: 'mouseReleased', x, y, button: 'left', clickCount: 1
        });
        await new Promise(r => setTimeout(r, 50));
        await chrome.debugger.detach(debuggee);
        sendResponse({ ok: true });
      } catch (err) {
        try { await chrome.debugger.detach(debuggee); } catch (_) {}
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});

// Handle local download or server upload request
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_CONTENT') {
    const { url, filename, jobDetails } = message;

    (async () => {
      try {
        const settings = await ClientManager.getSettings();

        // 1. Check if this is an automated Thumbnail job (needs to be uploaded to server inbox)
        if (jobDetails && jobDetails.asset_type === 'thumbnail') {
          console.log(`[Companion] Intercepted thumbnail download, fetching URL for upload: ${url}`);
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch generated image: ${response.statusText}`);
          }
          const blob = await response.blob();
          
          let uploadFilename = filename;
          if (!uploadFilename) {
            uploadFilename = `thumbnail_${jobDetails.id || Date.now()}.jpg`;
          }
          
          await UploadClient.uploadToInbox(blob, uploadFilename, jobDetails);
          console.log(`[Companion] Successfully uploaded thumbnail to backend inbox for job ${jobDetails.id}`);
          sendResponse({ ok: true, status: 'uploaded' });
          return;
        }

        // 2. Otherwise (manual mode or footage), download locally to the configured output folder
        const footageFolder = settings.footage_folder;
        
        let localFilename = filename;
        if (!localFilename) {
          const extension = message.extension || 'jpg';
          const prefix = message.prefix || 'Flow_Image';
          const promptIndex = message.promptIndex || 0;
          const batchIndex = message.batchIndex || 0;
          const date = new Date();
          const dateStr = date.toISOString().replace(/[:.]/g, '-').split('T')[0];
          const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
          
          localFilename = `${prefix}_prompt${promptIndex + 1}_batch${batchIndex + 1}_${dateStr}_${timeStr}.${extension}`;
        }
        localFilename = localFilename.replace(/[<>:"/\\|?*]/g, '_');

        let targetPath = localFilename;
        if (footageFolder) {
          let cleanFolder = footageFolder
            .replace(/^[a-zA-Z]:[\\/]*/, '') // Remove drive letter
            .replace(/[\\/]+/g, '/')         // Convert backslashes to forward slashes
            .replace(/^\//, '')              // Strip leading slash
            .replace(/\/$/, '');             // Strip trailing slash

          targetPath = `${cleanFolder}/${localFilename}`;
        }

        console.log(`[Companion] Downloading footage locally to: ${targetPath}`);

        chrome.downloads.download({
          url: url,
          filename: targetPath,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('[Companion] Download failed:', chrome.runtime.lastError.message);
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            console.log(`[Companion] Local download started: ID ${downloadId}`);
            sendResponse({ ok: true, downloadId });
          }
        });

      } catch (err) {
        console.error('[Companion] Content download/upload handler failed:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();

    return true; // async reply
  }
});
