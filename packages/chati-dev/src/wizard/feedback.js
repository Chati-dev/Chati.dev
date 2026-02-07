import ora from 'ora';
import { brand, success, dim } from '../utils/colors.js';

/**
 * Create a spinner with chati.dev branding
 */
export function createSpinner(text) {
  return ora({
    text,
    color: 'cyan',
    spinner: 'dots',
  });
}

/**
 * Show installation progress step
 */
export function showStep(message) {
  console.log(`  ${success('✓')} ${message}`);
}

/**
 * Show validation step
 */
export function showValidation(message) {
  console.log(`  ${success('✓')} ${message}`);
}

/**
 * Show warning
 */
export function showWarning(message) {
  console.log(`  ${brand('⚠')} ${message}`);
}

/**
 * Show error
 */
export function showError(message) {
  console.log(`  ${'✗'} ${message}`);
}

/**
 * Show quick start guide
 */
export function showQuickStart(title, steps) {
  console.log();
  console.log(`${brand(title)}:`);
  steps.forEach((step, i) => {
    console.log(`  ${dim(`${i + 1}.`)} ${step}`);
  });
  console.log();
  console.log(`${dim('Documentation:')} chati.dev/constitution.md`);
  console.log(`${dim('Session:')}       .chati/session.yaml`);
}

/**
 * Show summary table
 */
export function showSummary(data) {
  console.log();
  for (const [label, value] of Object.entries(data)) {
    const paddedLabel = label.padEnd(12);
    console.log(`  ${dim(paddedLabel)} ${value}`);
  }
}

/**
 * Show checklist of items to install
 */
export function showChecklist(items) {
  console.log();
  for (const item of items) {
    console.log(`    ${success('✓')} ${item}`);
  }
}
