#!/usr/bin/env node

import { resolve, basename } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const args = process.argv.slice(2);
const command = args[0] || 'init';
const targetDir = resolve(args.find(a => !a.startsWith('-') && a !== command) || process.cwd());

async function main() {
  switch (command) {
    case 'init':
    case 'install': {
      const { runWizard } = await import('../src/wizard/index.js');
      await runWizard(targetDir);
      break;
    }

    case 'status': {
      const watchFlag = args.includes('--watch') || args.includes('-w');
      const { renderDashboard, renderDashboardWatch } = await import('../src/dashboard/renderer.js');

      if (watchFlag) {
        renderDashboardWatch(targetDir);
      } else {
        renderDashboard(targetDir);
      }
      break;
    }

    case 'check-update': {
      const { checkForUpdate } = await import('../src/upgrade/checker.js');
      const result = await checkForUpdate(targetDir, pkg.version);

      if (result.error) {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }

      if (result.hasUpdate) {
        console.log(`chati.dev v${result.currentVersion} -> v${result.latestVersion} available`);
        console.log();
        for (const line of result.changes || []) {
          console.log(line);
        }
        console.log();
        console.log("Run 'npx chati-dev upgrade' to update.");
      } else {
        console.log(`chati.dev v${result.currentVersion} is up to date.`);
      }
      break;
    }

    case 'upgrade': {
      const versionFlag = args.indexOf('--version');
      const targetVersion = versionFlag !== -1 ? args[versionFlag + 1] : pkg.version;

      const { getCurrentVersion, updateConfigVersion } = await import('../src/upgrade/checker.js');
      const { createBackup, restoreFromBackup } = await import('../src/upgrade/backup.js');
      const { runMigrations } = await import('../src/upgrade/migrator.js');
      const { validateInstallation } = await import('../src/installer/validator.js');

      const currentVersion = getCurrentVersion(targetDir);
      if (!currentVersion) {
        console.error('No chati.dev installation found. Run `npx chati-dev init` first.');
        process.exit(1);
      }

      console.log(`Upgrading chati.dev v${currentVersion} -> v${targetVersion}...`);

      // 1. Create backup
      console.log('  Creating backup...');
      const backupDir = createBackup(targetDir, currentVersion);
      console.log(`  Backup created at: ${backupDir}`);

      // 2. Run migrations
      console.log('  Running migrations...');
      const migrationResult = await runMigrations(targetDir, currentVersion, targetVersion);

      if (!migrationResult.success) {
        console.error(`  Migration failed at: ${migrationResult.failedAt}`);
        console.error(`  Error: ${migrationResult.error}`);
        console.log('  Rolling back...');
        restoreFromBackup(targetDir, currentVersion);
        console.log('  Rollback complete.');
        process.exit(1);
      }

      console.log(`  ${migrationResult.migrationsRun} migration(s) applied.`);

      // 3. Validate
      console.log('  Validating...');
      const validation = await validateInstallation(targetDir);
      console.log(`  Validation: ${validation.passed}/${validation.total} checks passed.`);

      if (validation.passed < validation.total) {
        console.log('  Some validation checks failed. Installation may need manual review.');
      }

      // 4. Update config.yaml with new version
      updateConfigVersion(targetDir, targetVersion);

      console.log();
      console.log(`chati.dev upgraded to v${targetVersion} successfully.`);
      break;
    }

    case 'changelog': {
      console.log(`chati.dev v${pkg.version} Changelog`);
      console.log('═'.repeat(40));
      console.log();
      console.log('v1.0.0 - Initial Release');
      console.log('  - 13 agents (orchestrator + 12 specialized)');
      console.log('  - 5 workflow blueprints');
      console.log('  - 5 templates');
      console.log('  - Constitution (10 Articles + Preamble)');
      console.log('  - Dashboard TUI');
      console.log('  - Upgrade system with migrations');
      console.log('  - 6 IDE support');
      console.log('  - 4-language i18n (EN/PT/ES/FR)');
      break;
    }

    case '--reconfigure': {
      const { runWizard } = await import('../src/wizard/index.js');
      await runWizard(targetDir, { reconfigure: true });
      break;
    }

    case '--version':
    case '-v': {
      console.log(`chati-dev v${pkg.version}`);
      break;
    }

    case '--help':
    case '-h':
    case 'help': {
      console.log(`
chati-dev v${pkg.version}
AI-Powered Multi-Agent Development Framework

Usage:
  npx chati-dev init [project-name]     Initialize new project
  npx chati-dev install                 Install into existing project
  npx chati-dev status                  Show dashboard
  npx chati-dev status --watch          Auto-refresh dashboard
  npx chati-dev check-update            Check for updates
  npx chati-dev upgrade                 Upgrade to latest
  npx chati-dev upgrade --version X.Y.Z Upgrade to specific version
  npx chati-dev changelog               View changelog
  npx chati-dev --reconfigure           Reconfigure installation
  npx chati-dev --version               Show version
  npx chati-dev --help                  Show this help
`);
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      console.error("Run 'npx chati-dev --help' for usage.");
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
