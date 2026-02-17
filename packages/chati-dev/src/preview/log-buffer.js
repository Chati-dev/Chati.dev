/**
 * @fileoverview Circular log buffer for capturing server output.
 * Used by the preview launcher to collect stdout/stderr from dev servers.
 * Provides filtered views (errors, recent) for Dev agent context.
 */

/**
 * Circular buffer that captures server logs with metadata.
 * Automatically evicts oldest entries when capacity is reached.
 */
export class LogBuffer {
  #lines = [];
  #maxLines;

  /**
   * @param {number} [maxLines=200] - Maximum lines to retain
   */
  constructor(maxLines = 200) {
    this.#maxLines = maxLines;
  }

  /**
   * Append a log line.
   * @param {string} line - Raw output line
   * @param {'stdout'|'stderr'} [stream='stdout'] - Source stream
   */
  append(line, stream = 'stdout') {
    if (typeof line !== 'string') return;

    this.#lines.push({
      line: line.trim(),
      stream,
      timestamp: Date.now(),
    });

    // Evict oldest when over capacity
    if (this.#lines.length > this.#maxLines) {
      this.#lines.shift();
    }
  }

  /**
   * Get all buffered lines.
   * @returns {Array<{ line: string, stream: string, timestamp: number }>}
   */
  getAll() {
    return [...this.#lines];
  }

  /**
   * Get lines that look like errors or warnings.
   * Includes all stderr lines + stdout lines matching error patterns.
   * @returns {Array<{ line: string, stream: string, timestamp: number }>}
   */
  getErrors() {
    return this.#lines.filter(
      (l) =>
        l.stream === 'stderr' ||
        /(error|warn(ing)?|exception|failed|fatal|panic|unhandled)/i.test(l.line),
    );
  }

  /**
   * Get the N most recent lines.
   * @param {number} [n=50] - Number of lines
   * @returns {Array<{ line: string, stream: string, timestamp: number }>}
   */
  getRecent(n = 50) {
    return this.#lines.slice(-n);
  }

  /**
   * Get total number of buffered lines.
   * @returns {number}
   */
  get size() {
    return this.#lines.length;
  }

  /**
   * Clear all buffered lines.
   */
  clear() {
    this.#lines = [];
  }

  /**
   * Format logs as structured context for the Dev agent.
   * Includes error summary + recent output for debugging.
   * @returns {{ totalLines: number, errorCount: number, errors: string[], recentOutput: string[] }}
   */
  toContext() {
    const errors = this.getErrors();
    const recent = this.getRecent(50);

    return {
      totalLines: this.#lines.length,
      errorCount: errors.length,
      errors: errors.map((e) => e.line),
      recentOutput: recent.map((l) => `[${l.stream}] ${l.line}`),
    };
  }
}
