import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const DIGEST_DIR = '.chati/memories/shared/session';

/**
 * Build a session digest from current session state.
 * @param {string} projectDir - Project directory
 * @param {object} sessionState - Current session.yaml data
 * @returns {object} Digest object
 */
export function buildSessionDigest(projectDir, sessionState) {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];

  // Extract key information from session state
  const digest = {
    timestamp,
    date: dateStr,
    project: sessionState.project || {},
    mode: sessionState.mode || 'discover',
    pipeline: sessionState.pipeline || {},
    agents: {},
    summary: {},
  };

  // Agent states
  if (sessionState.agents) {
    Object.entries(sessionState.agents).forEach(([agentName, agentData]) => {
      digest.agents[agentName] = {
        status: agentData.status,
        completed_at: agentData.completed_at,
        validation_score: agentData.validation_score,
        output: agentData.output ? {
          artifact_count: agentData.output.artifacts?.length || 0,
          has_handoff: !!agentData.output.handoff,
        } : null,
      };
    });
  }

  // Build summary
  const totalAgents = Object.keys(digest.agents).length;
  const completedAgents = Object.values(digest.agents).filter(a => a.status === 'completed').length;
  const failedAgents = Object.values(digest.agents).filter(a => a.status === 'failed').length;

  digest.summary = {
    total_agents: totalAgents,
    completed_agents: completedAgents,
    failed_agents: failedAgents,
    completion_rate: totalAgents > 0 ? Math.round((completedAgents / totalAgents) * 100) : 0,
    phase: digest.pipeline.phase || 'unknown',
  };

  return digest;
}

/**
 * Save session digest to disk.
 * @param {string} projectDir - Project directory
 * @param {object} digest - Digest object
 * @returns {{ saved: boolean, path: string }}
 */
export function saveSessionDigest(projectDir, digest) {
  const dir = join(projectDir, DIGEST_DIR);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Include milliseconds in filename for uniqueness
  const timestamp = digest.timestamp.replace(/:/g, '-').replace(/\./g, '-').replace(/Z$/, '');
  let filename = `digest-${timestamp}.yaml`;
  let digestPath = join(dir, filename);

  // Handle collision by adding counter
  let counter = 1;
  while (existsSync(digestPath)) {
    filename = `digest-${timestamp}-${counter}.yaml`;
    digestPath = join(dir, filename);
    counter++;
  }

  try {
    const yamlContent = yaml.dump(digest, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    writeFileSync(digestPath, yamlContent, 'utf-8');

    return {
      saved: true,
      path: digestPath,
    };
  } catch {
    return {
      saved: false,
      path: digestPath,
    };
  }
}

/**
 * Load most recent session digest.
 * @param {string} projectDir - Project directory
 * @returns {{ loaded: boolean, digest: object|null }}
 */
export function loadLatestDigest(projectDir) {
  const dir = join(projectDir, DIGEST_DIR);

  if (!existsSync(dir)) {
    return {
      loaded: false,
      digest: null,
    };
  }

  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith('digest-') && f.endsWith('.yaml'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return {
        loaded: false,
        digest: null,
      };
    }

    const latestFile = join(dir, files[0]);
    const content = readFileSync(latestFile, 'utf-8');
    const digest = yaml.load(content);

    return {
      loaded: true,
      digest,
    };
  } catch {
    return {
      loaded: false,
      digest: null,
    };
  }
}

/**
 * List all session digests.
 * @param {string} projectDir - Project directory
 * @returns {object[]} Array of digest summaries
 */
export function listDigests(projectDir) {
  const dir = join(projectDir, DIGEST_DIR);

  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith('digest-') && f.endsWith('.yaml'))
      .sort()
      .reverse();

    return files.map(filename => {
      const filepath = join(dir, filename);

      try {
        const content = readFileSync(filepath, 'utf-8');
        const digest = yaml.load(content);

        return {
          filename,
          timestamp: digest.timestamp,
          date: digest.date,
          mode: digest.mode,
          phase: digest.summary?.phase || 'unknown',
          completion_rate: digest.summary?.completion_rate || 0,
          total_agents: digest.summary?.total_agents || 0,
        };
      } catch {
        return {
          filename,
          timestamp: null,
          date: null,
          mode: null,
          phase: 'error',
          completion_rate: 0,
          total_agents: 0,
        };
      }
    });
  } catch {
    return [];
  }
}

/**
 * Delete old session digests, keeping only the most recent N.
 * @param {string} projectDir - Project directory
 * @param {number} keepCount - Number of recent digests to keep (default: 10)
 * @returns {{ deleted: number, kept: number }}
 */
export function pruneDigests(projectDir, keepCount = 10) {
  const dir = join(projectDir, DIGEST_DIR);

  if (!existsSync(dir)) {
    return { deleted: 0, kept: 0 };
  }

  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith('digest-') && f.endsWith('.yaml'))
      .sort()
      .reverse();

    const toDelete = files.slice(keepCount);
    const toKeep = files.slice(0, keepCount);

    toDelete.forEach(filename => {
      const filepath = join(dir, filename);
      try {
        unlinkSync(filepath);
      } catch {
        // Ignore delete errors
      }
    });

    return {
      deleted: toDelete.length,
      kept: toKeep.length,
    };
  } catch {
    return { deleted: 0, kept: 0 };
  }
}
