import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * Create backup of chati.dev/ directory before upgrade
 * Backup location: chati.dev/.backup-v{version}/
 */
export function createBackup(targetDir, currentVersion) {
  const frameworkDir = join(targetDir, 'chati.dev');
  const backupDir = join(frameworkDir, `.backup-v${currentVersion}`);

  if (existsSync(backupDir)) {
    // Remove old backup of same version
    rmSync(backupDir, { recursive: true, force: true });
  }

  mkdirSync(backupDir, { recursive: true });

  // Backup framework files (NOT artifacts or intelligence)
  const dirsToBackup = [
    'orchestrator',
    'agents',
    'templates',
    'workflows',
    'quality-gates',
    'schemas',
    'frameworks',
    'i18n',
    'patterns',
    'migrations',
  ];

  const filesToBackup = [
    'constitution.md',
    'config.yaml',
  ];

  for (const dir of dirsToBackup) {
    const src = join(frameworkDir, dir);
    const dest = join(backupDir, dir);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
    }
  }

  for (const file of filesToBackup) {
    const src = join(frameworkDir, file);
    const dest = join(backupDir, file);
    if (existsSync(src)) {
      cpSync(src, dest);
    }
  }

  return backupDir;
}

/**
 * Restore from backup (rollback)
 */
export function restoreFromBackup(targetDir, version) {
  const frameworkDir = join(targetDir, 'chati.dev');
  const backupDir = join(frameworkDir, `.backup-v${version}`);

  if (!existsSync(backupDir)) {
    throw new Error(`Backup not found: ${backupDir}`);
  }

  // Restore backed-up directories
  const dirsToRestore = [
    'orchestrator',
    'agents',
    'templates',
    'workflows',
    'quality-gates',
    'schemas',
    'frameworks',
    'i18n',
    'patterns',
    'migrations',
  ];

  const filesToRestore = [
    'constitution.md',
    'config.yaml',
  ];

  for (const dir of dirsToRestore) {
    const src = join(backupDir, dir);
    const dest = join(frameworkDir, dir);
    if (existsSync(src)) {
      if (existsSync(dest)) {
        rmSync(dest, { recursive: true, force: true });
      }
      cpSync(src, dest, { recursive: true });
    }
  }

  for (const file of filesToRestore) {
    const src = join(backupDir, file);
    const dest = join(frameworkDir, file);
    if (existsSync(src)) {
      cpSync(src, dest);
    }
  }

  return true;
}
