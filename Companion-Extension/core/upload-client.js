// Companion Extension - Upload Client
// Handles multipart file uploads to Content Factory Asset Inbox

import { ApiClient } from './api-client.js';

export class UploadClient {
  /**
   * Uploads a generated file blob to Content Factory's /api/connectors/inbox/upload
   * @param {Blob} fileBlob - Generated media file (PNG/JPG)
   * @param {string} filename - Name of the file being uploaded
   * @param {Object} jobDetails - Connector job configuration (id, workspace_id, provider, asset_type, prompt)
   */
  static async uploadToInbox(fileBlob, filename, jobDetails) {
    const formData = new FormData();
    formData.append('workspace_id', jobDetails.workspace_id || 'default');
    formData.append('source', jobDetails.provider || 'Companion Extension');
    
    if (jobDetails.id) {
      formData.append('source_id', jobDetails.id); // maps to job ID
    }
    
    formData.append('asset_type', jobDetails.asset_type || 'thumbnail');
    
    // Metadata can include the prompt text
    const metadataText = jobDetails.prompt || '';
    formData.append('metadata', metadataText);
    
    // Append the file blob
    formData.append('file', fileBlob, filename);

    console.log(`[Companion] Uploading ${filename} (${fileBlob.size} bytes) for job ${jobDetails.id}...`);

    return ApiClient.request('/api/connectors/inbox/upload', {
      method: 'POST',
      body: formData
    });
  }
}
