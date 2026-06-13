// Companion Extension - Base Provider Interface
// Abstract base class that all browser automation providers must inherit

export class BaseProvider {
  /**
   * Executed by poller dispatcher
   * @param {Object} job - Backend job configuration
   * @param {Function} logFn - Function to push logs to UI panel
   */
  async execute(job, logFn) {
    throw new Error('execute(job, logFn) must be implemented by subclasses.');
  }
}
