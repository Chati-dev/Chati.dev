import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { logBanner } from '../utils/logger.js';
import { stepLanguage, stepProjectType, stepProviderSelection, stepEditorSelection, stepPrimaryProvider, stepConfirmation, stepTermsOfUse } from './questions.js';
import { createSpinner, showStep, showValidation, showQuickStart } from './feedback.js';
import { installFramework } from '../installer/core.js';
import { validateInstallation } from '../installer/validator.js';
import { initCollector, track as telemetryTrack, flush as telemetryFlush } from '../telemetry/collector.js';
import { sendEvents } from '../telemetry/sender.js';
import { getTelemetryConfig } from '../telemetry/config.js';
import { t } from './i18n.js';
import { DEFAULT_MCPS } from '../config/mcp-configs.js';
import { IDE_CONFIGS, IDE_TO_PROVIDER } from '../config/ide-configs.js';

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

  // Step 2: Terms of Use (must accept to continue)
  if (options.telemetry === undefined) {
    await stepTermsOfUse();
  }

  // Step 3: Project Type
  const projectType = options.projectType || await stepProjectType(targetDir);

  // Step 3a: Provider Selection (which AI providers to use)
  const selectedProviders = options.providers || await stepProviderSelection();

  // Step 3b: Primary provider (only if multiple)
  const primaryProvider = options.llmProvider || await stepPrimaryProvider(selectedProviders);

  // Step 3c: Editor Selection (which editor IDEs get rules files)
  const selectedEditors = options.editors || await stepEditorSelection();

  // Combine providers + editors into selectedIDEs for backward compatibility
  const providerToIDE = { claude: 'claude-code', gemini: 'gemini-cli', codex: 'codex-cli' };
  const selectedIDEs = options.ides || [
    ...selectedProviders.map(p => providerToIDE[p]).filter(Boolean),
    ...selectedEditors,
  ];

  // CLI providers derived from selected providers
  const cliProviders = selectedProviders;

  const selectedMCPs = options.mcps || DEFAULT_MCPS;

  // Step 4: Confirmation
  const projectName = basename(targetDir);
  const config = {
    projectName,
    projectType,
    language,
    llmProvider: primaryProvider,
    allProviders: cliProviders,
    selectedIDEs,
    selectedMCPs,
    targetDir,
    version: VERSION,
  };

  await stepConfirmation(config);

  // Telemetry: enabled by default (opt-out model via ToS)
  config.telemetryEnabled = options.telemetry !== undefined ? options.telemetry : true;

  // Installation + Validation
  const primaryIDE = selectedIDEs.find(ide => IDE_TO_PROVIDER[ide] === primaryProvider) || selectedIDEs[0];
  const primaryIDEName = IDE_CONFIGS[primaryIDE]?.name || primaryIDE;

  const installStart = Date.now();

  console.log();
  const installSpinner = createSpinner(t('installer.installing'));
  installSpinner.start();

  try {
    await installFramework(config);
    installSpinner.stop();

    showStep(t('installer.created_chati'));
    showStep(t('installer.created_framework'));

    // Show provider-specific command creation
    const commandStepMap = {
      'claude-code': 'Created .claude/commands/ (thin router)',
      'gemini-cli': 'Created .gemini/commands/ (TOML command)',
      'codex-cli': 'Created .agents/skills/chati/ (Codex skill)',
    };
    const commandStep = commandStepMap[primaryIDE] || t('installer.created_commands');
    showStep(commandStep);

    showStep(t('installer.installed_constitution'));
    showStep(t('installer.created_session'));
    if (selectedIDEs.includes('claude-code')) {
      showStep(t('installer.created_claude_md'));
    }
    if (cliProviders.length > 1) {
      showStep(t('installer.created_overlays'));
    }
    showStep(t('installer.created_memories'));
    showStep(t('installer.installed_intelligence'));
    showStep(`${t('installer.configured_mcps')} ${selectedMCPs.join(', ')}`);
    showStep(config.telemetryEnabled
      ? t('installer.tos_telemetry_enabled')
      : t('installer.tos_telemetry_disabled')
    );

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

    // Show quick start — same experience across all providers
    const invokeCmdMap = {
      'codex-cli': '$chati',
    };
    const invokeCmd = invokeCmdMap[primaryIDE] || '/chati';
    const quickStartSteps = [
      `${t('installer.quick_start_1')} (${primaryIDEName})`,
      `Type: ${invokeCmd}`,
      t('installer.quick_start_3'),
    ];

    // Add switch hint if multiple CLI providers configured
    if (cliProviders.length > 1) {
      quickStartSteps.push(t('installer.quick_start_switch_hint'));
    }

    showQuickStart(t('installer.quick_start_title'), quickStartSteps);

    // Track installation telemetry
    initCollector(config.telemetryEnabled);
    telemetryTrack('installation_completed', {
      providers: cliProviders,
      editors: selectedEditors,
      projectType,
      language,
      primaryProvider,
      installDuration: Date.now() - installStart,
    });
    const installEvents = telemetryFlush();
    if (installEvents.length > 0) {
      const tConfig = getTelemetryConfig(targetDir);
      sendEvents(installEvents, { ...tConfig, version: VERSION });
    }

    return { success: true, config, validation };
  } catch (err) {
    installSpinner.stop();
    const phase = err.message?.includes('validat') ? 'Validation' : 'Installation';
    p.cancel(`${phase} failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}
