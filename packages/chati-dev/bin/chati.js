#!/usr/bin/env node

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

import { logBanner } from '../src/utils/logger.js';

function showBanner() {
  let logoText;
  try {
    logoText = readFileSync(join(__dirname, '..', 'assets', 'logo.txt'), 'utf-8');
  } catch {
    logoText = 'Chati.dev';
  }
  logBanner(logoText, pkg.version);
}

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
        await renderDashboardWatch(targetDir);
      } else {
        await renderDashboard(targetDir);
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
        console.log(`Chati.dev v${result.currentVersion} -> v${result.latestVersion} available`);
        console.log();
        for (const line of result.changes || []) {
          console.log(line);
        }
        console.log();
        console.log("Run 'npx chati-dev upgrade' to update.");
      } else {
        console.log(`Chati.dev v${result.currentVersion} is up to date.`);
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
        console.error('No Chati.dev installation found. Run `npx chati-dev init` first.');
        process.exit(1);
      }

      console.log(`Upgrading Chati.dev v${currentVersion} -> v${targetVersion}...`);

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
      console.log(`Chati.dev upgraded to v${targetVersion} successfully.`);
      break;
    }

    case 'memory': {
      const { listMemories, searchMemories, cleanMemories, getMemoryStats } = await import('../src/intelligence/memory-manager.js');
      const memSubCmd = args[1] || 'stats';

      if (memSubCmd === 'list') {
        const agentIdx = args.indexOf('--agent');
        const sectorIdx = args.indexOf('--sector');
        const tierIdx = args.indexOf('--tier');
        const opts = {};
        if (agentIdx !== -1) opts.agent = args[agentIdx + 1];
        if (sectorIdx !== -1) opts.sector = args[sectorIdx + 1];
        if (tierIdx !== -1) opts.tier = args[tierIdx + 1];

        const memories = listMemories(targetDir, opts);
        if (memories.length === 0) {
          console.log('No memories found.');
        } else {
          console.log(`Found ${memories.length} memories:\n`);
          for (const m of memories) {
            console.log(`  ${m.id || m.path}  [${m.tier || '?'}]  ${m.sector || '?'}  ${m.agent || 'shared'}`);
          }
        }
      } else if (memSubCmd === 'search') {
        const query = args[2];
        if (!query) { console.error('Usage: npx chati-dev memory search <query>'); process.exit(1); }
        const results = searchMemories(targetDir, query);
        if (results.length === 0) {
          console.log(`No memories matching "${query}".`);
        } else {
          console.log(`Found ${results.length} memories matching "${query}":\n`);
          for (const r of results) {
            console.log(`  ${r.id || r.path}  [${r.matchType}]  ${r.agent || 'shared'}`);
          }
        }
      } else if (memSubCmd === 'clean') {
        const dryRun = args.includes('--dry-run');
        const result = cleanMemories(targetDir, { dryRun });
        console.log(`Cleaned: ${result.cleaned}, Skipped: ${result.skipped}${result.dryRun ? ' (dry run)' : ''}`);
      } else {
        const stats = getMemoryStats(targetDir);
        console.log('Memory Statistics');
        console.log('='.repeat(30));
        console.log(`  Total:      ${stats.total}`);
        console.log(`  HOT:        ${stats.byTier.hot}`);
        console.log(`  WARM:       ${stats.byTier.warm}`);
        console.log(`  COLD:       ${stats.byTier.cold}`);
        console.log(`  Disk Usage: ${(stats.diskUsage / 1024).toFixed(1)} KB`);
        if (Object.keys(stats.byAgent).length > 0) {
          console.log('\n  By Agent:');
          for (const [agent, count] of Object.entries(stats.byAgent)) {
            console.log(`    ${agent}: ${count}`);
          }
        }
      }
      break;
    }

    case 'context': {
      const { getContextStatus } = await import('../src/intelligence/context-status.js');
      const status = getContextStatus(targetDir);

      console.log('Context Status (Advisory)');
      console.log('='.repeat(30));
      console.log(`  Bracket:     ${status.bracket}`);
      console.log(`  Layers:      ${status.activeLayers.join(', ')}`);
      console.log(`  Budget:      ${status.tokenBudget} tokens`);
      console.log(`  Memory:      ${status.memoryLevel}`);
      console.log(`  Agent:       ${status.currentAgent}`);
      console.log(`  Pipeline:    ${status.pipelineState}`);
      console.log(`  Completed:   ${status.completedAgents} agents`);
      console.log(`\n  ${status.advisory}`);
      break;
    }

    case 'registry': {
      const { checkRegistry, getRegistryStats } = await import('../src/intelligence/registry-manager.js');
      const regSubCmd = args[1] || 'stats';

      if (regSubCmd === 'check') {
        const result = checkRegistry(targetDir);
        if (result.valid) {
          console.log(`Registry: ${result.totalEntities}/${result.totalEntities} entities present`);
          console.log('Status: VALID');
        } else {
          console.log(`Registry: ${result.found}/${result.totalEntities} entities present`);
          console.log('Missing:');
          for (const m of result.missing) {
            console.log(`  - ${m.path}`);
          }
          console.log('Status: INVALID');
        }
      } else {
        const stats = getRegistryStats(targetDir);
        console.log('Registry Statistics');
        console.log('='.repeat(30));
        console.log(`  Version:     ${stats.version || 'N/A'}`);
        console.log(`  Entities:    ${stats.totalEntities}`);
        console.log(`  Declared:    ${stats.declaredCount}`);
        console.log(`  Count Match: ${stats.countMatch ? 'Yes' : 'No'}`);
        if (Object.keys(stats.byType).length > 0) {
          console.log('\n  By Type:');
          for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`    ${type}: ${count}`);
          }
        }
      }
      break;
    }

    case 'health': {
      const { runHealthCheck } = await import('../src/intelligence/registry-manager.js');
      const checks = runHealthCheck(targetDir);

      console.log('Chati.dev Health Check');
      console.log('='.repeat(30));
      console.log(`  Registry:     ${checks.registry.pass ? 'PASS' : 'FAIL'}  ${checks.registry.details}`);
      console.log(`  Schemas:      ${checks.schemas.pass ? 'PASS' : 'FAIL'}  ${checks.schemas.details}`);
      console.log(`  Constitution: ${checks.constitution.pass ? 'PASS' : 'FAIL'}  ${checks.constitution.details}`);
      console.log(`  Agents:       ${checks.agents.pass ? 'PASS' : 'FAIL'}  ${checks.agents.details}`);
      console.log(`  Entities:     ${checks.entities.pass ? 'PASS' : 'FAIL'}  ${checks.entities.details}`);
      console.log();
      console.log(`  Status: ${checks.overall} (${checks.passCount}/${checks.totalChecks})`);
      break;
    }

    case 'changelog': {
      console.log(`Chati.dev v${pkg.version} Changelog`);
      console.log('═'.repeat(40));
      console.log();
      console.log('v1.0.0 - Initial Release');
      console.log('  - 13 agents (orchestrator + 12 specialized)');
      console.log('  - 6 workflow blueprints');
      console.log('  - 6 templates');
      console.log('  - Constitution (19 Articles + Preamble)');
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
      showBanner();
      console.log(`Usage:
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

Intelligence:
  npx chati-dev memory [stats|list|search|clean]  Memory management
  npx chati-dev context                            Context bracket status
  npx chati-dev registry [stats|check]             Entity registry
  npx chati-dev health                             System health check
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
