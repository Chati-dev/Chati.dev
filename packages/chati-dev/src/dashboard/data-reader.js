import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

/**
 * Read all dashboard data from project directory
 */
export function readDashboardData(targetDir) {
  const data = {
    session: null,
    config: null,
    agentScores: {},
    taskProgress: null,
    validationResults: null,
    recentActivity: [],
    blockers: [],
    gotchas: [],
  };

  // Read session.yaml
  const sessionPath = join(targetDir, '.chati', 'session.yaml');
  if (existsSync(sessionPath)) {
    try {
      data.session = yaml.load(readFileSync(sessionPath, 'utf-8'));
    } catch {
      data.session = null;
    }
  }

  // Read config.yaml
  const configPath = join(targetDir, 'chati.dev', 'config.yaml');
  if (existsSync(configPath)) {
    try {
      data.config = yaml.load(readFileSync(configPath, 'utf-8'));
    } catch {
      data.config = null;
    }
  }

  // Extract agent scores
  if (data.session?.agents) {
    for (const [name, info] of Object.entries(data.session.agents)) {
      data.agentScores[name] = {
        status: info.status || 'pending',
        score: info.score || 0,
        completedAt: info.completed_at || null,
      };
    }
  }

  // Extract blockers from backlog (high priority items)
  if (data.session?.backlog) {
    data.blockers = data.session.backlog.filter(
      item => item.priority === 'high' && item.status !== 'done'
    );
  }

  // Read task progress from artifacts
  const tasksDir = join(targetDir, 'chati.dev', 'artifacts', '6-Tasks');
  if (existsSync(tasksDir)) {
    try {
      const files = readdirSync(tasksDir).filter(f => f.endsWith('.yaml') || f.endsWith('.md'));
      data.taskProgress = { totalFiles: files.length };
    } catch {
      // Ignore
    }
  }

  // Read gotchas
  const gotchasPath = join(targetDir, 'chati.dev', 'intelligence', 'gotchas.yaml');
  if (existsSync(gotchasPath)) {
    try {
      const gotchasData = yaml.load(readFileSync(gotchasPath, 'utf-8'));
      data.gotchas = gotchasData?.gotchas || [];
    } catch {
      // Ignore
    }
  }

  // Build recent activity from agent completion timestamps
  if (data.session?.agents) {
    for (const [name, info] of Object.entries(data.session.agents)) {
      if (info.completed_at) {
        data.recentActivity.push({
          agent: name,
          score: info.score,
          completedAt: info.completed_at,
        });
      }
    }
    data.recentActivity.sort((a, b) => {
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return new Date(b.completedAt) - new Date(a.completedAt);
    });
  }

  return data;
}
