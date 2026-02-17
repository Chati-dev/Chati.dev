import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { logBanner } from '../utils/logger.js';
import { stepLanguage, stepProjectType, stepLlmProvider, stepConfirmation } from './questions.js';
import { createSpinner, showStep, showValidation, showQuickStart } from './feedback.js';
import { installFramework } from '../installer/core.js';
import { validateInstallation } from '../installer/validator.js';
import { t } from './i18n.js';
import { DEFAULT_MCPS } from '../config/mcp-configs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')).version;

/**
 * Run the 4-step installer wizard
 */
export async function runWizard(targetDir, options = {}) {
  // Load ASCII logo
  let logoText;
  try {
    logoText = readFileSync(join(__dirname, '..', '..', 'assets', 'logo.txt'), 'utf-8');
  } catch {
    logoText = 'chati.dev';
  }

  // Step 1: Logo + Language Selection (in English)
  logBanner(logoText, VERSION);

  p.intro('Setting up chati.dev');

  const language = options.language || await stepLanguage();

  // Step 2: Project Type
  const projectType = options.projectType || await stepProjectType(targetDir);

  // Step 3: LLM Provider
  const llmProvider = options.llmProvider || await stepLlmProvider();

  // Auto-configured: Claude Code + default MCPs
  const selectedIDEs = options.ides || ['claude-code'];
  const selectedMCPs = options.mcps || DEFAULT_MCPS;

  // Step 4: Confirmation
  const projectName = basename(targetDir);
  const config = {
    projectName,
    projectType,
    language,
    llmProvider,
    selectedIDEs,
    selectedMCPs,
    targetDir,
    version: VERSION,
  };

  await stepConfirmation(config);

  // Step 5: Installation + Validation
  console.log();
  const installSpinner = createSpinner(t('installer.installing'));
  installSpinner.start();

  try {
    await installFramework(config);
    installSpinner.stop();

    showStep(t('installer.created_chati'));
    showStep(t('installer.created_framework'));
    showStep(t('installer.created_commands'));
    showStep(t('installer.installed_constitution'));
    showStep(t('installer.created_session'));
    showStep(t('installer.created_claude_md'));
    showStep(t('installer.created_memories'));
    showStep(t('installer.installed_intelligence'));
    showStep(`${t('installer.configured_mcps')} ${selectedMCPs.join(', ')}`);

    // Validation
    console.log();
    const validateSpinner = createSpinner(t('installer.validating'));
    validateSpinner.start();

    const validation = await validateInstallation(targetDir);
    validateSpinner.stop();

    // Show validation results based on actual checks
    if (validation.agents?.pass) showValidation(t('installer.agents_valid'));
    if (validation.constitution?.pass) showValidation(t('installer.constitution_ok'));
    if (validation.intelligence?.pass) showValidation(t('installer.intelligence_valid'));
    if (validation.registry?.pass) showValidation(t('installer.registry_valid'));
    if (validation.memories?.pass) showValidation(t('installer.memories_valid'));
    if (validation.session?.pass) showValidation(t('installer.session_ok'));
    showValidation(t('installer.handoff_ok'));
    showValidation(t('installer.validation_ok'));

    // Warn if any checks failed
    if (validation.passed < validation.total) {
      const failed = validation.total - validation.passed;
      p.log.warn(`${failed} validation check(s) did not pass. Run 'npx chati-dev health' for details.`);
    }

    console.log();
    p.outro(t('installer.success'));

    showQuickStart(t('installer.quick_start_title'), [
      `${t('installer.quick_start_1')} (Claude Code)`,
      t('installer.quick_start_2'),
      t('installer.quick_start_3'),
    ]);

    return { success: true, config, validation };
  } catch (err) {
    installSpinner.stop();
    const phase = err.message?.includes('validat') ? 'Validation' : 'Installation';
    p.cancel(`${phase} failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}
