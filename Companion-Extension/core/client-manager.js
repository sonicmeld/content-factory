// Companion Extension - Client Manager
// Handles Chrome storage for connected runtime identity and server configurations

export class ClientManager {
  static DEFAULT_SETTINGS = {
    client_id: '',
    runtime_name: 'flow-thumbnail',
    server_url: 'http://localhost:8001',
    api_key: '',
    footage_folder: 'ContentFactory/Footage'
  };

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
