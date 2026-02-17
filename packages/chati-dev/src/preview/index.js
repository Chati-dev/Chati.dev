/**
 * @fileoverview User Preview module — local server for pre-deploy validation.
 *
 * Detects the project's framework, spawns a dev server on an available port,
 * captures logs for Dev agent context, and manages server lifecycle.
 *
 * Usage:
 *   import { detectDevCommand, findAvailablePort, launchPreview } from './preview/index.js';
 *
 *   const devCmd = detectDevCommand(projectDir);
 *   const port = await findAvailablePort(devCmd.defaultPort);
 *   const handle = await launchPreview(projectDir, { ...devCmd, port });
 *   // ... user validates ...
 *   // handle.logs.toContext() → send to Dev agent
 *   // await handle.kill() → when user decides to stop
 */

export { detectDevCommand, detectProjectKind } from './detector.js';
export { findAvailablePort, launchPreview, waitForServer, openBrowser } from './launcher.js';
export { LogBuffer } from './log-buffer.js';
