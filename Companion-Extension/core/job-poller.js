// Companion Extension - Job Poller
// Periodically polls Content Factory backend for pending connector jobs,
// filters them locally by Chrome Profile Runtime Role, and dispatches to providers.

import { ApiClient } from './api-client.js';
import { ClientManager } from './client-manager.js';

export class JobPoller {
  constructor(callbacks = {}) {
    this.onLog = callbacks.onLog || (() => {});
    this.onJobStart = callbacks.onJobStart || (() => {});
    this.onJobEnd = callbacks.onJobEnd || (() => {});
    
    this.isPolling = false;
    this.timer = null;
    this.currentJob = null;
    this.pollIntervalMs = 8000; // Poll every 8 seconds
  }

  /**
   * Starts the polling process
   */
  async start() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.onLog('Poller started.', 'info');
    await this.pollOnce();
  }

  /**
   * Stops the polling process
   */
  stop() {
    this.isPolling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onLog('Poller stopped.', 'info');
  }

  scheduleNextPoll() {
    if (this.timer) clearTimeout(this.timer);
    if (!this.isPolling) return;

    this.timer = setTimeout(() => {
      this.pollOnce();
    }, this.pollIntervalMs);
  }

  /**
   * Executes a single poll request and dispatches execution
   */
  async pollOnce() {
    if (!this.isPolling) return;

    try {
      const settings = await ClientManager.getSettings();
      const runtimeName = settings.runtime_name || 'flow-thumbnail';
      
      this.onLog(`[Poller] Checking server at ${settings.server_url}...`, 'info');
      
      const jobs = await ApiClient.get('/api/connectors/jobs?status=pending');
      
      // Local Job Routing based on configured Runtime Name (Chrome Profile Role)
      // NOTE ON FUTURE JOB CLAIMING: Currently, the backend Connector Hub returns all pending jobs
      // globally. This client poller filters jobs locally using the active Chrome Profile's `runtime_name`
      // role to execute tasks targeted at this worker. In future revisions, the backend will manage
      // worker targeting and locking (claiming) directly via API endpoints, preventing multiple active
      // client instances from conflicting on the same task.
      const matchedJobs = jobs.filter((job) => {
        if (runtimeName === 'flow-thumbnail') {
          return job.provider === 'Google Flow' && job.asset_type === 'thumbnail';
        } else if (runtimeName === 'flow-footage') {
          return job.provider === 'Google Flow' && job.asset_type === 'footage';
        } else if (runtimeName === 'chatgpt-main') {
          return job.provider === 'ChatGPT';
        }
        return false;
      });

      if (matchedJobs.length === 0) {
        this.onLog(`[Poller] No pending jobs matching profile: ${runtimeName}`, 'info');
        this.scheduleNextPoll();
        return;
      }

      // Pick the first matched job
      const activeJob = matchedJobs[0];
      this.onLog(`[Poller] Matched pending job: ${activeJob.id.substring(0, 8)} (${activeJob.asset_type})`, 'act');

      // Temporarily halt polling loop during job execution
      this.timer = null;
      this.currentJob = activeJob;
      this.onJobStart(activeJob);

      try {
        // Open the job on the server (transitions server state to "opened")
        this.onLog(`[Poller] Opening job ${activeJob.id.substring(0, 8)} on server...`, 'info');
        await ApiClient.get(`/api/connectors/jobs/${activeJob.id}`);

        // Lazy-load provider registry to dispatch execution
        const { getProvider } = await import('../providers/provider-registry.js');
        const provider = getProvider(activeJob.provider);

        if (!provider) {
          throw new Error(`Unsupported provider: ${activeJob.provider}`);
        }

        // Execute the automation flow
        this.onLog(`[Poller] Starting provider execution: ${activeJob.provider}...`, 'info');
        await provider.execute(activeJob, this.onLog);

        this.onLog(`[Poller] Job ${activeJob.id.substring(0, 8)} completed successfully!`, 'success');
        this.onJobEnd(activeJob, 'completed');
      } catch (jobError) {
        this.onLog(`[Poller] Job execution failed: ${jobError.message}`, 'error');
        
        // Report failure to server
        try {
          await ApiClient.post(`/connectors/jobs`, {
            id: activeJob.id,
            status: 'failed'
          }); // Or let backend handle it. Note: backend schema has update endpoints.
        } catch (_) {}

        this.onJobEnd(activeJob, 'failed');
      }

      this.currentJob = null;
      
      // Reschedule poller
      if (this.isPolling) {
        this.scheduleNextPoll();
      }

    } catch (pollError) {
      this.onLog(`[Poller] Error: ${pollError.message}`, 'error');
      this.scheduleNextPoll();
    }
  }
}
