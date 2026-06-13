// Companion Extension - ChatGPT Provider (Stub)
// Handles automation execution wrapper for ChatGPT web provider

import { BaseProvider } from './base-provider.js';

export class ChatGPTProvider extends BaseProvider {
  /**
   * Executes the prompt on ChatGPT interface (Stub)
   * @param {Object} job - Backend job metadata
   * @param {Function} logFn - Log callback to UI
   */
  async execute(job, logFn) {
    logFn(`[ChatGPT] Starting execution for job ${job.id.substring(0, 8)}...`, 'info');
    
    // Simulate prompt processing
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    logFn(`[ChatGPT] ChatGPT provider is currently running as a placeholder stub.`, 'warn');
    logFn(`[ChatGPT] Simulated job completion successfully.`, 'success');
  }
}
