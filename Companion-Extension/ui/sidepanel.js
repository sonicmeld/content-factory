// Companion Extension - Side Panel Controller
// Manages tab navigation, logging window, poller lifecycles, and manual batch overrides

import { SettingsManager } from './settings.js';
import { JobPoller } from '../core/job-poller.js';
import { getProvider } from '../providers/provider-registry.js';
import { parsePrompts } from '../content/flow-content.js'; // Wait, let's keep parsePrompts local to avoid importing from content scripts

document.addEventListener('DOMContentLoaded', () => {
  // 1. Tab Switching
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById(target).classList.add('active');
    });
  });

  // 2. Logging utility
  const logArea = document.getElementById('logArea');
  const btnClearLogs = document.getElementById('btnClearLogs');

  function appendLog(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    
    const time = new Date().toTimeString().split(' ')[0];
    line.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    
    logArea.appendChild(line);
    logArea.scrollTop = logArea.scrollHeight;
  }

  btnClearLogs.addEventListener('click', () => {
    logArea.innerHTML = '';
    appendLog('Logs cleared.', 'info');
  });

  // 3. Initialize Settings Panel
  SettingsManager.init(appendLog);

  // 4. Poller Lifecycle Orchestration
  const pollerSwitch = document.getElementById('pollerSwitch');
  const pollerStatusBadge = document.getElementById('pollerStatusBadge');
  const statusJobId = document.getElementById('statusJobId');
  const statusPrompt = document.getElementById('statusPrompt');

  const poller = new JobPoller({
    onLog: (msg, type) => appendLog(msg, type),
    onJobStart: (job) => {
      statusJobId.textContent = job.id.substring(0, 12);
      statusPrompt.textContent = job.prompt;
      statusPrompt.title = job.prompt;
      pollerStatusBadge.textContent = 'Running';
      pollerStatusBadge.className = 'status-badge status-running';
    },
    onJobEnd: (job, status) => {
      statusJobId.textContent = 'None';
      statusPrompt.textContent = 'N/A';
      statusPrompt.title = 'No active job';
      if (poller.isPolling) {
        pollerStatusBadge.textContent = 'Active';
        pollerStatusBadge.className = 'status-badge status-connected';
      } else {
        pollerStatusBadge.textContent = 'Idle';
        pollerStatusBadge.className = 'status-badge status-idle';
      }
    }
  });

  pollerSwitch.addEventListener('change', (e) => {
    if (e.target.checked) {
      pollerStatusBadge.textContent = 'Active';
      pollerStatusBadge.className = 'status-badge status-connected';
      poller.start();
    } else {
      pollerStatusBadge.textContent = 'Idle';
      pollerStatusBadge.className = 'status-badge status-idle';
      poller.stop();
    }
  });

  // 5. Manual Prompt Batcher Override
  const fileDropArea = document.getElementById('fileDropArea');
  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.getElementById('fileLabel');
  const manualInput = document.getElementById('manualInput');
  const manualType = document.getElementById('manualType');
  const manualBatch = document.getElementById('manualBatch');
  
  const btnStartManual = document.getElementById('btnStartManual');
  const btnStopManual = document.getElementById('btnStopManual');

  let isManualRunning = false;

  // Manual parser
  function parseLines(text) {
    return text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  }

  // Handle Drag & Drop
  fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'var(--accent)';
  });

  fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.style.borderColor = '';
  });

  fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileDropArea.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    fileLabel.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      manualInput.value = e.target.result;
      appendLog(`Loaded prompts from: ${file.name}`, 'info');
    };
    reader.readAsText(file);
  }

  // Start Manual Batch Clicked
  btnStartManual.addEventListener('click', async () => {
    if (isManualRunning) return;
    if (poller.isPolling) {
      alert("Please stop the automated poller before running a manual batch.");
      return;
    }

    const prompts = parseLines(manualInput.value);
    if (prompts.length === 0) {
      alert("Please type some prompts or load a text file first.");
      return;
    }

    isManualRunning = true;
    btnStartManual.classList.add('hidden');
    btnStopManual.classList.remove('hidden');

    appendLog(`Starting manual batch: ${prompts.length} prompts...`, 'act');

    try {
      const provider = getProvider('Google Flow'); // default to Flow for manual
      if (!provider) {
        throw new Error('Google Flow provider not registered');
      }

      for (let i = 0; i < prompts.length && isManualRunning; i++) {
        const promptText = prompts[i];
        appendLog(`[Manual Batch] Prompt ${i + 1}/${prompts.length}: "${promptText.substring(0, 40)}..."`, 'info');
        
        // Mock a connector job format so the provider can execute it cleanly
        const mockJob = {
          id: `manual-job-${Date.now()}-${i}`,
          prompt: promptText,
          provider: 'Google Flow',
          asset_type: 'footage' // manual is default local downloads workflow
        };

        await provider.execute(mockJob, appendLog);
      }
      
      appendLog('Manual batch completed successfully!', 'success');
    } catch (err) {
      appendLog(`Manual batch execution failed: ${err.message}`, 'error');
    } finally {
      isManualRunning = false;
      btnStartManual.classList.remove('hidden');
      btnStopManual.classList.add('hidden');
    }
  });

  btnStopManual.addEventListener('click', () => {
    isManualRunning = false;
    appendLog('Manual batch stopped by user.', 'warn');
    btnStartManual.classList.remove('hidden');
    btnStopManual.classList.add('hidden');
  });

});
