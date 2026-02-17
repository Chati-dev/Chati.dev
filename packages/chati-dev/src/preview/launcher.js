/**
 * @fileoverview Preview server lifecycle management.
 * Spawns dev servers, finds available ports, health-checks, and opens browsers.
 * NEVER kills existing processes — only manages servers it spawns.
 */

import net from 'net';
import http from 'http';
import { spawn } from 'child_process';
import { platform } from 'os';
import { LogBuffer } from './log-buffer.js';

/**
 * Test if a port is available (not in use by another process).
 * Uses net.createServer to probe — never kills existing services.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

/**
 * Find an available port starting from a given number.
 * Scans sequentially — NEVER kills existing processes on occupied ports.
 *
 * @param {number} [startPort=3000] - Port to start scanning from
 * @param {number} [maxAttempts=20] - Maximum ports to try
 * @returns {Promise<number>} Available port number
 * @throws {Error} If no port is available within range
 */
export async function findAvailablePort(startPort = 3000, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    const available = await isPortAvailable(port);
    if (available) return port;
  }

  throw new Error(
    `No available port found in range ${startPort}-${startPort + maxAttempts - 1}`,
  );
}

/**
 * Wait for an HTTP server to respond on the given URL.
 * Polls with exponential backoff until the server is ready.
 *
 * @param {string} url - URL to check (e.g., "http://localhost:3000")
 * @param {number} [timeout=30000] - Max wait time in ms
 * @returns {Promise<void>}
 * @throws {Error} If server doesn't respond within timeout
 */
export function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  let delay = 500;

  return new Promise((resolve, reject) => {
    function attempt() {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server at ${url} did not respond within ${timeout}ms`));
        return;
      }

      const req = http.get(url, (res) => {
        // Any response (even 404) means server is up
        res.resume();
        resolve();
      });

      req.on('error', () => {
        // Server not ready yet — retry with backoff
        delay = Math.min(delay * 1.5, 3000);
        setTimeout(attempt, delay);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(attempt, delay);
      });
    }

    attempt();
  });
}

/**
 * Open a URL in the system's default browser.
 *
 * @param {string} url - URL to open
 * @returns {void}
 */
export function openBrowser(url) {
  const os = platform();
  let command;
  let args;

  if (os === 'darwin') {
    command = 'open';
    args = [url];
  } else if (os === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const proc = spawn(command, args, { stdio: 'ignore', detached: true });
  proc.unref();
}

/**
 * Gracefully kill a child process.
 * Sends SIGTERM, waits 3s, then SIGKILL if still alive.
 *
 * @param {import('child_process').ChildProcess} proc
 * @returns {Promise<void>}
 */
function killProcess(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }

    const forceKillTimer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // Already dead
      }
      resolve();
    }, 3000);

    proc.once('exit', () => {
      clearTimeout(forceKillTimer);
      resolve();
    });

    try {
      proc.kill('SIGTERM');
    } catch {
      clearTimeout(forceKillTimer);
      resolve();
    }
  });
}

/**
 * Launch a preview server for the project.
 *
 * @param {string} projectDir - Absolute path to project root
 * @param {object} options
 * @param {string} options.command - Command to run (e.g., "npm")
 * @param {string[]} options.args - Command arguments (e.g., ["run", "dev"])
 * @param {number} options.port - Port to use
 * @param {string} [options.framework='unknown'] - Detected framework name
 * @param {boolean} [options.openBrowser=true] - Open browser after server is ready
 * @param {number} [options.timeout=30000] - Health check timeout in ms
 * @returns {Promise<{ url: string, port: number, pid: number, framework: string, logs: LogBuffer, kill: () => Promise<void> }>}
 */
export async function launchPreview(projectDir, options) {
  const {
    command,
    args,
    port,
    framework = 'unknown',
    openBrowser: shouldOpenBrowser = true,
    timeout = 30000,
  } = options;

  const logs = new LogBuffer();
  const url = `http://localhost:${port}`;

  // Spawn the dev server
  const proc = spawn(command, args, {
    cwd: projectDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Capture stdout
  if (proc.stdout) {
    proc.stdout.on('data', (data) => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) logs.append(line, 'stdout');
      }
    });
  }

  // Capture stderr
  if (proc.stderr) {
    proc.stderr.on('data', (data) => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) logs.append(line, 'stderr');
      }
    });
  }

  // Handle spawn errors
  const spawnError = await new Promise((resolve) => {
    proc.once('error', (err) => resolve(err));
    // Give it a moment to fail or succeed
    setTimeout(() => resolve(null), 500);
  });

  if (spawnError) {
    throw new Error(`Failed to start dev server: ${spawnError.message}`);
  }

  // Wait for the server to be ready
  await waitForServer(url, timeout);

  // Open browser
  if (shouldOpenBrowser) {
    openBrowser(url);
  }

  return {
    url,
    port,
    pid: proc.pid,
    framework,
    logs,
    kill: () => killProcess(proc),
  };
}
