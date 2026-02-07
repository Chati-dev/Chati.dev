import { readDashboardData } from './data-reader.js';
import {
  buildHeader,
  buildProjectInfo,
  buildClaritySection,
  buildBuildSection,
  buildValidateSection,
  buildFooter,
} from './layout.js';
import { dim } from '../utils/colors.js';

/**
 * Render dashboard once (static mode)
 */
export function renderDashboard(targetDir) {
  const data = readDashboardData(targetDir);

  if (!data.session) {
    console.log('No chati.dev session found. Run `npx chati-dev init` first.');
    return;
  }

  const lines = [
    ...buildHeader(data),
    ...buildProjectInfo(data),
    '',
    ...buildClaritySection(data),
    '',
    ...buildBuildSection(data),
    '',
    ...buildValidateSection(data),
    '',
    ...buildFooter(data),
  ];

  console.log();
  for (const line of lines) {
    console.log(line);
  }
  console.log();
}

/**
 * Render dashboard in watch mode (auto-refresh)
 */
export function renderDashboardWatch(targetDir, intervalMs = 5000) {
  // Initial render
  console.clear();
  renderDashboard(targetDir);
  console.log(dim(`  Auto-refreshing every ${intervalMs / 1000}s. Press Ctrl+C to exit.`));

  // Set up interval
  const timer = setInterval(() => {
    console.clear();
    renderDashboard(targetDir);
    console.log(dim(`  Auto-refreshing every ${intervalMs / 1000}s. Press Ctrl+C to exit.`));
    console.log(dim(`  Last update: ${new Date().toLocaleTimeString()}`));
  }, intervalMs);

  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log();
    process.exit(0);
  });

  return timer;
}

/**
 * Render plain text fallback (for terminals without TUI support)
 */
export function renderPlainDashboard(targetDir) {
  const data = readDashboardData(targetDir);

  if (!data.session) {
    console.log('No chati.dev session found. Run `npx chati-dev init` first.');
    return;
  }

  const session = data.session;
  const project = session.project || {};

  console.log();
  console.log('=== chati.dev Dashboard ===');
  console.log();
  console.log(`Project:  ${project.name || 'unknown'}`);
  console.log(`Type:     ${project.type || 'unknown'}`);
  console.log(`Phase:    ${project.state || 'unknown'}`);
  console.log(`Mode:     ${session.execution_mode || 'interactive'}`);
  console.log(`Language: ${session.language || 'en'}`);
  console.log();

  console.log('--- Agent Scores ---');
  for (const [name, info] of Object.entries(data.agentScores)) {
    const status = info.status === 'pending' ? '--' : info.status === 'in_progress' ? '...' : String(info.score);
    console.log(`  ${name.padEnd(20)} ${status}`);
  }

  console.log();
  console.log(`Blockers: ${data.blockers.length || 'None'}`);
  console.log(`Gotchas:  ${data.gotchas.length} patterns`);
  console.log();
}
