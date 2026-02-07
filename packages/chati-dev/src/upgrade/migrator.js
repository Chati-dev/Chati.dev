import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import semver from 'semver';

/**
 * Find applicable migrations between two versions
 */
export function findMigrations(targetDir, fromVersion, toVersion) {
  const migrationsDir = join(targetDir, 'chati.dev', 'migrations');
  if (!existsSync(migrationsDir)) return [];

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.yaml'))
    .sort();

  const applicable = [];

  for (const file of files) {
    try {
      const content = yaml.load(readFileSync(join(migrationsDir, file), 'utf-8'));
      const migration = content?.migration;

      if (!migration?.from || !migration?.to) continue;

      // Check if this migration is in the upgrade path
      if (
        semver.gte(migration.from, fromVersion) &&
        semver.lte(migration.to, toVersion)
      ) {
        applicable.push({
          file,
          from: migration.from,
          to: migration.to,
          description: migration.description || '',
          breaking: migration.breaking || false,
          steps: content.steps || [],
          rollback: content.rollback || [],
        });
      }
    } catch {
      // Skip invalid migration files
    }
  }

  // Sort by target version
  applicable.sort((a, b) => semver.compare(a.to, b.to));

  return applicable;
}

/**
 * Execute a single migration step
 */
function executeMigrationStep(targetDir, step) {
  switch (step.type) {
    case 'create_directory': {
      const dir = join(targetDir, step.path);
      if (!existsSync(dir) || !step.idempotent) {
        mkdirSync(dir, { recursive: true });
      }
      break;
    }

    case 'create_file': {
      const filePath = join(targetDir, step.path);
      if (!existsSync(filePath) || !step.skip_if_exists) {
        mkdirSync(join(targetDir, step.path, '..'), { recursive: true });
        writeFileSync(filePath, step.content || '', 'utf-8');
      }
      break;
    }

    case 'update_yaml': {
      const filePath = join(targetDir, step.path);
      if (!existsSync(filePath)) break;

      const content = yaml.load(readFileSync(filePath, 'utf-8')) || {};

      if (step.operation === 'add_field') {
        const keys = step.field.split('.');
        let obj = content;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        const lastKey = keys[keys.length - 1];
        if (!step.skip_if_exists || !(lastKey in obj)) {
          obj[lastKey] = step.default;
        }
      } else if (step.operation === 'set') {
        const keys = step.field.split('.');
        let obj = content;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = step.value;
      }

      writeFileSync(filePath, yaml.dump(content, { lineWidth: -1 }), 'utf-8');
      break;
    }

    case 'delete_directory': {
      const dir = join(targetDir, step.path);
      if (existsSync(dir)) {
        if (step.only_if_empty) {
          const files = readdirSync(dir);
          if (files.length === 0) {
            rmSync(dir, { recursive: true });
          }
        } else {
          rmSync(dir, { recursive: true });
        }
      }
      break;
    }

    default:
      // Unknown step type - skip
      break;
  }
}

/**
 * Run all applicable migrations sequentially
 */
export async function runMigrations(targetDir, fromVersion, toVersion) {
  const migrations = findMigrations(targetDir, fromVersion, toVersion);

  if (migrations.length === 0) {
    return { success: true, migrationsRun: 0 };
  }

  const results = [];

  for (const migration of migrations) {
    try {
      for (const step of migration.steps) {
        executeMigrationStep(targetDir, step);
      }
      results.push({ file: migration.file, success: true });
    } catch (err) {
      results.push({ file: migration.file, success: false, error: err.message });

      // Attempt rollback for this migration
      try {
        for (const step of migration.rollback) {
          executeMigrationStep(targetDir, step);
        }
      } catch {
        // Rollback failed - return error
      }

      return {
        success: false,
        migrationsRun: results.filter(r => r.success).length,
        failedAt: migration.file,
        error: err.message,
        results,
      };
    }
  }

  return {
    success: true,
    migrationsRun: migrations.length,
    results,
  };
}
