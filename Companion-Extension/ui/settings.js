// Companion Extension - Settings UI Manager
// Handles settings panel loading, saving, and server connectivity validation

import { ClientManager } from '../core/client-manager.js';

export class SettingsManager {
  static init(logFn) {
    const cfgServerUrl = document.getElementById('cfgServerUrl');
    const cfgApiKey = document.getElementById('cfgApiKey');
    const cfgRuntimeName = document.getElementById('cfgRuntimeName');
    const cfgClientId = document.getElementById('cfgClientId');
    const cfgFootageFolder = document.getElementById('cfgFootageFolder');
    
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const btnTestConn = document.getElementById('btnTestConn');
    const statusRuntime = document.getElementById('statusRuntime');

    // 1. Load settings and populate form
    async function loadSettings() {
      const settings = await ClientManager.getSettings();
      cfgServerUrl.value = settings.server_url;
      cfgApiKey.value = settings.api_key;
      cfgRuntimeName.value = settings.runtime_name;
      cfgClientId.value = settings.client_id;
      cfgFootageFolder.value = settings.footage_folder;

      // Update Target Runtime name in Poller status
      if (statusRuntime) {
        statusRuntime.textContent = settings.runtime_name;
      }
    }

    // 2. Save settings
    btnSaveSettings.addEventListener('click', async () => {
      const serverUrl = cfgServerUrl.value.trim() || 'http://localhost';
      const apiKey = cfgApiKey.value.trim();
      const runtimeName = cfgRuntimeName.value;
      const footageFolder = cfgFootageFolder.value.trim() || 'ContentFactory/Footage';

      const currentSettings = await ClientManager.getSettings();
      const isReRegistrationNeeded = currentSettings.server_url !== serverUrl || currentSettings.runtime_name !== runtimeName;

      await ClientManager.saveSettings({
        server_url: serverUrl,
        runtime_name: runtimeName,
        footage_folder: footageFolder,
        ...(isReRegistrationNeeded ? { api_key: '' } : (apiKey ? { api_key: apiKey } : {}))
      });

      if (statusRuntime) {
        statusRuntime.textContent = runtimeName;
      }

      logFn(`Settings saved. Checking auto-registration...`, 'info');
      await ClientManager.registerIfNeeded();
      
      // Force instantaneous heartbeat update
      chrome.runtime.sendMessage({ type: 'FORCE_HEARTBEAT' }, () => {
        if (chrome.runtime.lastError) {} // Suppress callback error if side panel is standalone
      });

      logFn(`Settings saved successfully! Runtime Name: ${runtimeName}`, 'success');
      alert('Settings saved!');
    });

    // 3. Test Connection
    btnTestConn.addEventListener('click', async () => {
      const url = cfgServerUrl.value.trim() || 'http://localhost';
      const cleanUrl = url.replace(/\/$/, '');
      const testEndpoint = `${cleanUrl}/api/companion/me`;

      logFn(`Testing connection to ${cleanUrl}...`, 'info');
      
      const settings = await ClientManager.getSettings();
      const headers = {
        'Content-Type': 'application/json',
        'X-Client-Id': settings.client_id
      };
      
      const apiKeyVal = cfgApiKey.value.trim() || settings.api_key;
      if (apiKeyVal) {
        headers['Authorization'] = `Bearer ${apiKeyVal}`;
      } else {
        logFn('Warning: Testing connection without an API key (registration may be required).', 'warn');
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const response = await fetch(testEndpoint, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const companionMe = await response.json();
          logFn(`Connection success! Server verified runtime: ${companionMe.runtime_name} (${companionMe.status})`, 'success');
          alert(`Connection successful! Verified as: ${companionMe.runtime_name}`);
        } else {
          logFn(`Connection failed: HTTP ${response.status}`, 'error');
          alert(`Failed: Server returned HTTP ${response.status}`);
        }
      } catch (err) {
        logFn(`Connection error: ${err.message}`, 'error');
        alert(`Connection failed: ${err.message}`);
      }
    });

    // Initial load
    loadSettings();
  }
}
