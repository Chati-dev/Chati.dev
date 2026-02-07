import { success, error, warning, info, muted, brand, dim } from './colors.js';

export function logStep(message) {
  console.log(`  ${success('✓')} ${message}`);
}

export function logError(message) {
  console.log(`  ${error('✗')} ${message}`);
}

export function logWarning(message) {
  console.log(`  ${warning('⚠')} ${message}`);
}

export function logInfo(message) {
  console.log(`  ${info('ℹ')} ${message}`);
}

export function logMuted(message) {
  console.log(`  ${muted(message)}`);
}

export function logBanner(logoText, version) {
  const lines = logoText.trim().split('\n');
  for (const line of lines) {
    console.log(brand(line));
  }
  console.log(brand(`chati.dev v${version}`));
  console.log(dim('AI-Powered Multi-Agent Development Framework'));
  console.log(dim('═'.repeat(55)));
  console.log();
}

export function logSection(title) {
  console.log();
  console.log(`  ${brand('──')} ${title} ${brand('─'.repeat(Math.max(0, 45 - title.length)))}`);
}

export function logResult(label, value) {
  console.log(`  ${muted(label + ':')}  ${value}`);
}
