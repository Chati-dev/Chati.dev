import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { logBanner } from '../utils/logger.js';
import { stepLanguage, stepProjectType, stepIDEs, stepMCPs, stepConfirmation } from './questions.js';
import { createSpinner, showStep, showValidation, showQuickStart } from './feedback.js';
import { installFramework } from '../installer/core.js';
import { validateInstallation } from '../installer/validator.js';
import { t } from './i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')).version;

/**
 * Run the 6-step installer wizard
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

  // Step 3: IDE Selection
  const selectedIDEs = options.ides || await stepIDEs();

  // Step 4: MCP Selection
  const selectedMCPs = options.mcps || await stepMCPs(projectType);

  // Step 5: Confirmation
  const projectName = basename(targetDir);
  const config = {
    projectName,
    projectType,
    language,
    selectedIDEs,
    selectedMCPs,
    targetDir,
    version: VERSION,
  };

  await stepConfirmation(config);

  // Step 6: Installation + Validation
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

    if (selectedMCPs.length > 0) {
      showStep(`${t('installer.configured_mcps')} ${selectedMCPs.join(', ')}`);
    }

    // Validation
    console.log();
    const validateSpinner = createSpinner(t('installer.validating'));
    validateSpinner.start();

    const validation = await validateInstallation(targetDir);
    validateSpinner.stop();

    showValidation(t('installer.agents_valid'));
    showValidation(t('installer.handoff_ok'));
    showValidation(t('installer.validation_ok'));
    showValidation(t('installer.constitution_ok'));
    showValidation(t('installer.session_ok'));

    console.log();
    p.outro(t('installer.success'));

    const primaryIDE = selectedIDEs[0] || 'your IDE';
    showQuickStart(t('installer.quick_start_title'), [
      `${t('installer.quick_start_1')} (${primaryIDE})`,
      t('installer.quick_start_2'),
      t('installer.quick_start_3'),
    ]);

    return { success: true, config, validation };
  } catch (err) {
    installSpinner.stop();
    p.cancel(`Installation failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}
