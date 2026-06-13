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
      const serverUrl = cfgServerUrl.value.trim() || 'http://localhost:8001';
      const apiKey = cfgApiKey.value.trim();
      const runtimeName = cfgRuntimeName.value;
      const footageFolder = cfgFootageFolder.value.trim() || 'ContentFactory/Footage';

      await ClientManager.saveSettings({
        server_url: serverUrl,
        api_key: apiKey,
        runtime_name: runtimeName,
        footage_folder: footageFolder
      });

      if (statusRuntime) {
        statusRuntime.textContent = runtimeName;
      }

      logFn(`Settings saved successfully! Runtime Name: ${runtimeName}`, 'success');
      alert('Settings saved!');
    });

    // 3. Test Connection
    btnTestConn.addEventListener('click', async () => {
      const url = cfgServerUrl.value.trim() || 'http://localhost:8001';
      const cleanUrl = url.replace(/\/$/, '');
      const testEndpoint = `${cleanUrl}/api/channels`; // Test getting channels to verify API access

      logFn(`Testing connection to ${cleanUrl}...`, 'info');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      if (cfgApiKey.value.trim()) {
        headers['Authorization'] = `Bearer ${cfgApiKey.value.trim()}`;
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
          logFn(`Connection success! Server returned HTTP ${response.status}`, 'success');
          alert('Connection successful!');
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
