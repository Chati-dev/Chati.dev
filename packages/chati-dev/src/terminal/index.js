/**
 * @fileoverview Barrel exports for the terminal orchestration module.
 */

export {
  buildSpawnCommand,
  spawnTerminal,
  spawnParallelGroup,
  killTerminal,
  getTerminalStatus,
  cleanParentEnv,
  _resetCounter,
} from './spawner.js';

export { TerminalMonitor } from './monitor.js';

export {
  collectResults,
  mergeHandoffs,
  buildConsolidatedHandoff,
  validateResults,
} from './collector.js';

export {
  WRITE_SCOPES,
  getWriteScope,
  validateWriteScopes,
  isPathAllowed,
  getReadScope,
  buildIsolationEnv,
} from './isolation.js';

export {
  buildAgentPrompt,
  AGENT_FILE_MAP,
} from './prompt-builder.js';

export {
  parseAgentOutput,
} from './handoff-parser.js';
