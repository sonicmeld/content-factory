// Companion Extension - Provider Registry
// Maps backend provider names to runtime provider implementations

import { FlowProvider } from './flow-provider.js';
import { ChatGPTProvider } from './chatgpt-provider.js';

const registry = {
  'Google Flow': new FlowProvider(),
  'ChatGPT': new ChatGPTProvider()
};

/**
   * Retrieves provider instance by name
   * @param {string} name - e.g. "Google Flow" or "ChatGPT"
   * @returns {BaseProvider|null}
   */
export function getProvider(name) {
  return registry[name] || null;
}
