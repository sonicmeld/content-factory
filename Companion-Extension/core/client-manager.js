// Companion Extension - Client Manager
// Handles Chrome storage for connected runtime identity and server configurations

export class ClientManager {
  static DEFAULT_SETTINGS = {
    client_id: '',
    runtime_name: 'flow-thumbnail',
    server_url: 'http://localhost',
    api_key: '',
    footage_folder: 'ContentFactory/Footage'
  };

  /**
   * Automatically registers this client ID & runtime name with the server if api_key is missing
   */
  static async registerIfNeeded() {
    const settings = await ClientManager.getSettings();
    if (settings.api_key) {
      return; // Already registered
    }

    const serverUrl = settings.server_url.replace(/\/$/, '');
    const registerUrl = `${serverUrl}/api/companion/register`;

    console.log(`[Companion] Attempting auto-registration to: ${registerUrl} with name "${settings.runtime_name}"`);

    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          runtime_name: settings.runtime_name || 'flow-thumbnail',
          client_id: settings.client_id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.api_key) {
        await ClientManager.saveSettings({ api_key: data.api_key });
        console.log(`[Companion] Auto-registration successful! Client is paired. ID: ${data.runtime_id}`);
      }
    } catch (err) {
      console.warn('[Companion] Auto-registration failed:', err.message);
    }
  }

  /**
   * Generates a standard UUID v4
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Loads all settings from chrome.storage.local
   */
  static async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(Object.keys(ClientManager.DEFAULT_SETTINGS), async (result) => {
        let settings = { ...ClientManager.DEFAULT_SETTINGS, ...result };
        
        // Generate UUID on first run if missing
        if (!settings.client_id) {
          settings.client_id = ClientManager.generateUUID();
          await ClientManager.saveSettings({ client_id: settings.client_id });
        }
        
        resolve(settings);
      });
    });
  }

  /**
   * Saves settings to chrome.storage.local
   * @param {Object} newSettings - partial or complete settings object
   */
  static async saveSettings(newSettings) {
    return new Promise((resolve) => {
      chrome.storage.local.set(newSettings, () => {
        resolve();
      });
    });
  }
}
