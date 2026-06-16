// Companion Extension - Google Flow Provider
// Controls browser automation tab for Google Flow image/video generation

import { BaseProvider } from './base-provider.js';
import { ClientManager } from '../core/client-manager.js';

export class FlowProvider extends BaseProvider {
  /**
   * Automates Google Flow prompt generation
   * @param {Object} job - Backend job metadata
   * @param {Function} logFn - Log callback to UI
   */
  async execute(job, logFn) {
    logFn(`[Flow] Searching for Google Flow tab...`, 'info');
    const tab = await this.getOrCreateFlowTab(logFn);
    
    // Ensure flow content script is active
    await this.ensureContentScript(tab.id, logFn);

    const settings = await ClientManager.getSettings();
    
    // Determine generation type and aspect ratio: forced to 16:9 HD for both
    const isFootage = job.asset_type === 'footage';
    const type = isFootage ? 'video' : 'image';
    const ratio = '16:9'; // Forced 16:9 aspect ratio for YouTube
    const downloadQuality = isFootage ? '720p' : '1K'; // HD dimensions (1K = 1280x720 for image, 720p for video)

    // Prepare prompt payload settings
    const payloadSettings = {
      type: type,
      ratio: ratio,
      batch: '1',    // Default output count is 1 for automation
      downloadQuality: downloadQuality,
      globalDelayMs: 2000,
      job_details: job // Pass details down to content script download trigger
    };

    logFn(`[Flow] Sending prompt to page editor: "${job.prompt.substring(0, 60)}..."`, 'info');
    
    // Dispatch PROCESS_PROMPT to content script
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "PROCESS_PROMPT",
        payload: { prompt: job.prompt, settings: payloadSettings }
      }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ status: 'failed', message: `Content script connection failed: ${chrome.runtime.lastError.message}` });
        } else {
          resolve(res || { status: 'failed', message: 'Empty response received from content script.' });
        }
      });
    });

    if (response.status === 'success' || response.status === 'partial') {
      logFn(`[Flow] Automation completed: ${response.message}`, 'success');
      return response;
    } else {
      throw new Error(response.message || 'Google Flow page automation failed.');
    }
  }

  /**
   * Returns active Google Flow tab, or opens a new one
   */
  async getOrCreateFlowTab(logFn) {
    const tabs = await chrome.tabs.query({ url: "*://labs.google/fx/tools/flow*" });
    if (tabs.length > 0) {
      logFn(`[Flow] Re-using active Google Flow tab (ID: ${tabs[0].id})`, 'info');
      return tabs[0];
    }
    
    logFn(`[Flow] Opening new Google Flow tab...`, 'info');
    const tab = await chrome.tabs.create({ url: "https://labs.google/fx/tools/flow" });
    
    // Wait for the page load lifecycle to complete
    await new Promise((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
    
    // Wait a brief timeout for React/DOM elements to fully render
    await new Promise(r => setTimeout(r, 3000));
    return tab;
  }

  /**
   * Verifies content script ping, or injects content/flow-content.js dynamically
   */
  async ensureContentScript(tabId, logFn) {
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: "PING" }, (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        });
      });
    } catch (e) {
      logFn('[Flow] Injecting flow-content.js script...', 'info');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/flow-content.js']
      });
      // Pause to bind message listeners
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
