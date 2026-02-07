import { brand, dim, success, yellow, green, gray, bold, red } from '../utils/colors.js';

/**
 * Dashboard layout definition
 * Formats data into the TUI display
 */

/**
 * Format agent score with color
 */
function formatScore(score, status) {
  if (status === 'pending') return gray('--');
  if (status === 'in_progress') return yellow('...');
  if (score >= 95) return green(String(score));
  if (score >= 80) return yellow(String(score));
  return red(String(score));
}

/**
 * Format project state with label
 */
function formatState(state) {
  const stateMap = {
    clarity: brand('CLARITY'),
    build: yellow('BUILD'),
    validate: bold('VALIDATE'),
    deploy: green('DEPLOY'),
    completed: success('COMPLETED'),
  };
  return stateMap[state] || gray(state || 'unknown');
}

/**
 * Format execution mode
 */
function formatMode(mode) {
  if (mode === 'autonomous') return yellow('Ralph Wiggum');
  return dim('Interactive');
}

/**
 * Build the header section
 */
export function buildHeader(data) {
  const version = data.config?.version || '?.?.?';
  const line = '─'.repeat(59);
  return [
    brand(`┌${line}┐`),
    brand(`│  chati.dev Dashboard`) + ' '.repeat(59 - 21 - version.length - 2) + dim(`v${version}`) + brand('  │'),
    brand(`├${line}┤`),
  ];
}

/**
 * Build project info section
 */
export function buildProjectInfo(data) {
  const session = data.session || {};
  const project = session.project || {};

  const name = project.name || 'unknown';
  const type = project.type === 'brownfield' ? 'Brownfield' : 'Greenfield';
  const state = formatState(project.state);
  const mode = formatMode(session.execution_mode);
  const lang = session.language || 'en';
  const ide = (session.ides || [])[0] || 'unknown';

  return [
    brand('│') + `  ${dim('Project:')} ${name}` + ' '.repeat(Math.max(1, 30 - name.length)) + `${dim('Type:')} ${type}` + ' '.repeat(Math.max(1, 18 - type.length)) + brand('│'),
    brand('│') + `  ${dim('Phase:')}   ${state}` + ' '.repeat(Math.max(1, 28)) + `${dim('Mode:')} ${mode}` + ' '.repeat(Math.max(1, 10)) + brand('│'),
    brand('│') + `  ${dim('Language:')} ${lang}` + ' '.repeat(Math.max(1, 30 - lang.length)) + `${dim('IDE:')}  ${ide}` + ' '.repeat(Math.max(1, 18 - ide.length)) + brand('│'),
  ];
}

/**
 * Build CLARITY section with agent scores
 */
export function buildClaritySection(data) {
  const scores = data.agentScores || {};

  const clarityAgents = [
    ['WU', scores['greenfield-wu'] || scores['brownfield-wu'] || { status: 'pending', score: 0 }],
    ['Brief', scores['brief'] || { status: 'pending', score: 0 }],
    ['Detail', scores['detail'] || { status: 'pending', score: 0 }],
    ['Arch', scores['architect'] || { status: 'pending', score: 0 }],
    ['UX', scores['ux'] || { status: 'pending', score: 0 }],
    ['Phases', scores['phases'] || { status: 'pending', score: 0 }],
    ['Tasks', scores['tasks'] || { status: 'pending', score: 0 }],
    ['QA-P', scores['qa-planning'] || { status: 'pending', score: 0 }],
  ];

  const row1 = clarityAgents.slice(0, 4)
    .map(([name, info]) => `${dim(name.padEnd(8))} ${formatScore(info.score, info.status)}`)
    .join('  ');

  const row2 = clarityAgents.slice(4)
    .map(([name, info]) => `${dim(name.padEnd(8))} ${formatScore(info.score, info.status)}`)
    .join('  ');

  return [
    brand('│') + `  ${brand('── CLARITY')} ${'─'.repeat(46)}` + brand('│'),
    brand('│') + `  │ ${row1}` + ' '.repeat(5) + brand('│'),
    brand('│') + `  │ ${row2}` + ' '.repeat(5) + brand('│'),
    brand('│') + `  ${'─'.repeat(57)}` + brand('│'),
  ];
}

/**
 * Build BUILD section
 */
export function buildBuildSection(data) {
  const devInfo = data.agentScores?.dev || { status: 'pending', score: 0 };
  const status = devInfo.status === 'pending' ? gray('Waiting') :
    devInfo.status === 'in_progress' ? yellow('In Progress') :
    green('Complete');

  return [
    brand('│') + `  ${brand('── BUILD')} ${'─'.repeat(48)}` + brand('│'),
    brand('│') + `  │ ${dim('Dev Agent:')} ${status}` + ' '.repeat(38) + brand('│'),
    brand('│') + `  ${'─'.repeat(57)}` + brand('│'),
  ];
}

/**
 * Build VALIDATE section
 */
export function buildValidateSection(data) {
  const qaInfo = data.agentScores?.['qa-implementation'] || { status: 'pending', score: 0 };
  const tests = qaInfo.status === 'completed' ? green('Pass') : gray('--');

  return [
    brand('│') + `  ${brand('── VALIDATE')} ${'─'.repeat(45)}` + brand('│'),
    brand('│') + `  │ ${dim('Tests:')} ${tests}  ${dim('SAST:')} ${gray('--')}  ${dim('DAST:')} ${gray('--')}  ${dim('DS Audit:')} ${gray('--')}` + ' '.repeat(5) + brand('│'),
    brand('│') + `  ${'─'.repeat(57)}` + brand('│'),
  ];
}

/**
 * Build footer with recent activity, blockers, gotchas
 */
export function buildFooter(data) {
  const recent = data.recentActivity?.[0];
  const recentText = recent
    ? `${recent.agent} completed (score: ${recent.score})`
    : 'No recent activity';

  const blockerCount = data.blockers?.length || 0;
  const blockerText = blockerCount > 0 ? red(`${blockerCount} active`) : green('None');

  const gotchaCount = data.gotchas?.length || 0;
  const gotchaText = gotchaCount > 0 ? `${gotchaCount} patterns learned` : 'None yet';

  const line = '─'.repeat(59);

  return [
    brand('│') + `  ${dim('Recent:')}   ${recentText}` + ' '.repeat(Math.max(1, 40 - recentText.length)) + brand('│'),
    brand('│') + `  ${dim('Blockers:')} ${blockerText}` + ' '.repeat(42) + brand('│'),
    brand('│') + `  ${dim('Gotchas:')}  ${gotchaText}` + ' '.repeat(Math.max(1, 40 - gotchaText.length)) + brand('│'),
    brand(`└${line}┘`),
  ];
}
